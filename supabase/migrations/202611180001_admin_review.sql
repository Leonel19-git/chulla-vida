begin;

-- Central guard covers both the current RPC and legacy review callers. No automatic approval.
create function public.guard_verification_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_request public.merchant_verification_requests;
begin
  if auth.uid() is null or not public.is_reviewer() or not public.current_user_email_verified() then
    raise exception 'Confirmed reviewer required' using errcode = '42501';
  end if;
  select * into v_request from public.merchant_verification_requests where id = new.request_id;
  if not found or v_request.applicant_id = auth.uid() or public.is_org_member(v_request.organization_id) then
    raise exception 'Reviewers cannot decide on their own organization' using errcode = '42501';
  end if;
  if new.reviewer_id is distinct from auth.uid() then
    raise exception 'Reviewer must match current identity' using errcode = '42501';
  end if;
  if new.decision = 'approved' then
    if coalesce(new.checklist->'identity', 'false'::jsonb) <> 'true'::jsonb
       or coalesce(new.checklist->'representation', 'false'::jsonb) <> 'true'::jsonb
       or coalesce(new.checklist->'documents', 'false'::jsonb) <> 'true'::jsonb then
      raise exception 'Completed human review checklist required';
    end if;
    if not exists(select 1 from public.verification_documents d where d.request_id = new.request_id) then
      raise exception 'Private supporting document required';
    end if;
  end if;
  if nullif(trim(new.registry_reference), '') is not null and (
    coalesce(new.checklist->'official_registry', 'false'::jsonb) <> 'true'::jsonb
    or char_length(trim(new.registry_reference)) not between 5 and 1000
  ) then
    raise exception 'Explicit official registry check and reference required';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_verification_review() from public, anon, authenticated;
create trigger guard_verification_review before insert on public.verification_reviews
for each row execute function public.guard_verification_review();

commit;
