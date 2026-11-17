-- Correcciones aditivas. Preparada para revisión: NO aplicada a servicios remotos.
-- Conserva las firmas RPC y los importes/estados existentes. No habilita ventas.
begin;

-- El manager revisa cobros; únicamente organizations.owner_id cambia el destino del dinero.
drop policy bank_accounts_manager_insert on public.organization_bank_accounts;
drop policy bank_accounts_manager_update on public.organization_bank_accounts;
drop policy bank_accounts_manager_delete on public.organization_bank_accounts;
create policy bank_accounts_owner_insert on public.organization_bank_accounts for insert to authenticated
  with check (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()));
create policy bank_accounts_owner_update on public.organization_bank_accounts for update to authenticated
  using (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()))
  with check (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()));
create policy bank_accounts_owner_delete on public.organization_bank_accounts for delete to authenticated
  using (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()));

create or replace function public.submit_merchant_application(p_name text, p_kind text, p_treatment_consent boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_request uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.current_user_email_verified() then raise exception 'Verified account required' using errcode = '42501'; end if;
  if p_treatment_consent is distinct from true then raise exception 'Treatment consent required'; end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 160
    or p_kind is null or p_kind not in ('business','community') then raise exception 'Invalid application' using errcode = '22023'; end if;
  insert into public.organizations(owner_id,name,kind,verification_status)
    values(auth.uid(),trim(p_name),p_kind,'in_review') returning id into v_org;
  insert into public.merchant_verification_requests(organization_id,applicant_id,treatment_consent_at)
    values(v_org,auth.uid(),now()) returning id into v_request;
  return v_request;
end;
$$;

create or replace function public.submit_experience_request(p_experience_id text, p_kind text, p_message text, p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_experience public.catalog_experiences; v_id uuid; v_existing public.experience_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.current_user_email_verified() then raise exception 'Verified account required' using errcode = '42501'; end if;
  if p_experience_id is null or char_length(p_experience_id) > 200 or p_idempotency_key is null
    or p_kind is null or p_kind not in ('information','booking')
    or p_message is null or char_length(trim(p_message)) not between 1 and 2000 then
    raise exception 'Invalid request' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_idempotency_key::text,0));
  select * into v_existing from public.experience_requests where traveler_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.experience_id is distinct from p_experience_id or v_existing.kind is distinct from p_kind
      or v_existing.message is distinct from trim(p_message) then raise exception 'Idempotency key reused for different request'; end if;
    return v_existing.id;
  end if;
  select * into v_experience from public.catalog_experiences where id = p_experience_id and published for share;
  if not found then raise exception 'Experience unavailable'; end if;
  if p_kind = 'booking' then raise exception 'Online booking unavailable; request information instead'; end if;
  insert into public.experience_requests(traveler_id,experience_id,organization_id,kind,message,idempotency_key)
    values(auth.uid(),p_experience_id,v_experience.organization_id,p_kind,trim(p_message),p_idempotency_key) returning id into v_id;
  return v_id;
end;
$$;

-- La revisión humana puede pedir otra copia sin reabrir documentos ya aprobados.
drop policy merchant_document_upload on storage.objects;
create policy merchant_document_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'merchant-verification'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists(select 1 from public.organizations o where o.id::text = (storage.foldername(storage.objects.name))[1] and o.owner_id = auth.uid())
  and exists(select 1 from public.merchant_verification_requests r
    where r.organization_id::text = (storage.foldername(storage.objects.name))[1]
      and r.applicant_id = auth.uid() and r.status in ('submitted','needs_changes')));
drop policy register_own_verification_document on public.verification_documents;
create policy register_own_verification_document on public.verification_documents for insert to authenticated with check (
  uploaded_by = auth.uid()
  and exists(select 1 from public.merchant_verification_requests r where r.id = request_id
    and r.applicant_id = auth.uid() and r.status in ('submitted','needs_changes')
    and split_part(object_path,'/',1) = r.organization_id::text and split_part(object_path,'/',2) = auth.uid()::text)
  and exists(select 1 from storage.objects o where o.bucket_id = 'merchant-verification' and o.name = object_path));

create or replace function public.submit_transfer_receipt(p_transfer_id uuid, p_path text, p_mime text, p_size integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t public.transfer_payments; v_metadata jsonb;
begin
  select * into t from public.transfer_payments where id = p_transfer_id for update;
  if not found or v_uid is null or t.traveler_id <> v_uid then raise exception 'Transfer unavailable' using errcode = '42501'; end if;
  if t.status not in ('awaiting_receipt','rejected') then raise exception 'Transfer is not waiting for a receipt'; end if;
  if p_mime is null or p_mime not in ('image/jpeg','image/png','image/webp','application/pdf')
    or p_size is null or p_size < 1 or p_size > 5242880 or p_path is null or char_length(p_path) > 400
    or p_path not like (t.organization_id::text || '/' || v_uid::text || '/' || t.id::text || '/%')
    or p_path like '%..%' or array_length(string_to_array(p_path,'/'),1) <> 4 or split_part(p_path,'/',4) = '' then
    raise exception 'Invalid receipt'; end if;
  select o.metadata into v_metadata from storage.objects o where o.bucket_id = 'payment-receipts' and o.name = p_path;
  if not found then raise exception 'Receipt file not found'; end if;
  -- Storage aporta metadatos; conserva compatibilidad con objetos históricos sin metadata.
  -- Esto no analiza bytes ni convierte un comprobante en pago verificado.
  if v_metadata is not null and (v_metadata->>'mimetype' is distinct from p_mime
    or v_metadata->>'size' is distinct from p_size::text) then raise exception 'Receipt metadata mismatch'; end if;
  update public.transfer_payments set status = 'receipt_submitted',receipt_path = p_path,receipt_mime = p_mime,receipt_size = p_size,
    receipt_submitted_at = now(),rejection_reason = null,reviewed_by = null,reviewed_at = null where id = t.id returning * into t;
  insert into public.admin_audit_logs(actor_id,action,target_table,target_id,detail)
    values(v_uid,'transfer.receipt_submitted','transfer_payments',t.id::text,jsonb_build_object('mime',p_mime,'size',p_size));
  return public.transfer_payment_json(t,null);
end;
$$;

revoke all on function public.submit_merchant_application(text,text,boolean),
  public.submit_experience_request(text,text,text,uuid), public.submit_transfer_receipt(uuid,text,text,integer) from public,anon;
grant execute on function public.submit_merchant_application(text,text,boolean),
  public.submit_experience_request(text,text,text,uuid), public.submit_transfer_receipt(uuid,text,text,integer) to authenticated,service_role;
commit;
