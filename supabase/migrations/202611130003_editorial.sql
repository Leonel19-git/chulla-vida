-- Editorial review is deliberately separate from publicly seeded content.
begin;
create table public.editorial_drafts (
  experience_id text primary key references public.catalog_experiences(id),
  revision bigint not null check (revision > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object' and content->>'bookingEnabled' = 'false'),
  source_note text not null check (char_length(source_note) between 10 and 2000),
  status text not null default 'in_review' check (status in ('in_review', 'changes_requested', 'ready_for_legal')),
  base_catalog_updated_at timestamptz not null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.editorial_audit (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null references public.catalog_experiences(id),
  revision bigint not null,
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('draft_saved', 'changes_requested', 'ready_for_legal', 'publication_blocked')),
  note text not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.editorial_drafts enable row level security;
alter table public.editorial_audit enable row level security;
create policy admin_editorial_drafts on public.editorial_drafts for select to authenticated using (public.is_admin());
create policy admin_editorial_audit on public.editorial_audit for select to authenticated using (public.is_admin());
revoke all on public.editorial_drafts, public.editorial_audit from public, anon, authenticated;
grant select on public.editorial_drafts, public.editorial_audit to authenticated;
grant all on public.editorial_drafts, public.editorial_audit to service_role;

create function public.save_editorial_draft(p_experience_id text, p_patch jsonb, p_source_note text,
  p_expected_revision bigint, p_expected_catalog_updated_at timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_catalog public.catalog_experiences; v_draft public.editorial_drafts; v_content jsonb; v_price jsonb;
  v_location jsonb; v_item jsonb; v_key text; v_revision bigint;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or char_length(p_patch::text) > 100000 then raise exception 'Invalid editorial patch'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('title','summary','description','activities','price','sourceCheckedAt','locationInfo')) then raise exception 'Protected field cannot be edited'; end if;
  if p_source_note is null or char_length(trim(p_source_note)) not between 10 and 2000 then raise exception 'Source note required'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_catalog_updated_at is null then raise exception 'Expected versions required'; end if;
  for v_key in select unnest(array['title','summary','description','sourceCheckedAt']) loop
    if jsonb_typeof(p_patch->v_key) is distinct from 'string' then raise exception 'Required text field missing'; end if;
  end loop;
  if char_length(trim(p_patch->>'title')) not between 3 and 160
    or char_length(trim(p_patch->>'summary')) not between 10 and 1200
    or char_length(trim(p_patch->>'description')) not between 20 and 20000 then raise exception 'Text length out of range'; end if;
  if (p_patch->>'sourceCheckedAt') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Editorial date required'; end if;
  perform (p_patch->>'sourceCheckedAt')::date;
  if jsonb_typeof(p_patch->'activities') is distinct from 'array' or jsonb_array_length(p_patch->'activities') > 100 then raise exception 'Invalid activities'; end if;
  if exists(select 1 from jsonb_array_elements(p_patch->'activities') i where jsonb_typeof(i) <> 'string' or char_length(i #>> '{}') > 1000) then raise exception 'Invalid activity value'; end if;
  v_price := p_patch->'price';
  if jsonb_typeof(v_price) is distinct from 'object' then raise exception 'Price reference required'; end if;
  if exists(select 1 from jsonb_object_keys(v_price) k where k not in ('min','max','currency','originalLabel','includes','excludes')) then raise exception 'Protected price field'; end if;
  if coalesce(v_price->>'currency','') not in ('USD','EUR') or jsonb_typeof(v_price->'originalLabel') is distinct from 'string'
    or char_length(trim(v_price->>'originalLabel')) not between 3 and 1000 then raise exception 'Invalid price reference'; end if;
  foreach v_key in array array['min','max'] loop
    if coalesce(jsonb_typeof(v_price->v_key),'missing') not in ('number','null') then raise exception 'Invalid amount'; end if;
    if jsonb_typeof(v_price->v_key) = 'number' and ((v_price->>v_key)::numeric < 0 or (v_price->>v_key)::numeric > 1000000) then raise exception 'Amount out of range'; end if;
  end loop;
  if (v_price->>'min')::numeric > (v_price->>'max')::numeric then raise exception 'Minimum exceeds maximum'; end if;
  foreach v_key in array array['includes','excludes'] loop
    if jsonb_typeof(v_price->v_key) is distinct from 'array' or jsonb_array_length(v_price->v_key) > 100 then raise exception 'Invalid services list'; end if;
    if exists(select 1 from jsonb_array_elements(v_price->v_key) i where jsonb_typeof(i) <> 'string' or char_length(i #>> '{}') > 1000) then raise exception 'Invalid services value'; end if;
  end loop;
  v_location := p_patch->'locationInfo';
  if jsonb_typeof(v_location) is distinct from 'object' or jsonb_typeof(v_location->'accessSummary') is distinct from 'string'
    or char_length(v_location->>'accessSummary') > 5000 or jsonb_typeof(v_location->'transportOptions') is distinct from 'array'
    or jsonb_array_length(v_location->'transportOptions') > 30 then raise exception 'Invalid access information'; end if;
  if exists(select 1 from jsonb_object_keys(v_location) k where k not in ('accessSummary','transportOptions')) then raise exception 'Map/source provenance cannot be edited here'; end if;
  for v_item in select jsonb_array_elements(v_location->'transportOptions') loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Invalid transport option'; end if;
    if exists(select 1 from jsonb_object_keys(v_item) k where k not in ('label','mode','durationLabel','priceLabel','notes')) then raise exception 'Unsupported transport field'; end if;
    if jsonb_typeof(v_item->'label') is distinct from 'string' or char_length(trim(v_item->>'label')) not between 1 and 300
      or coalesce(v_item->>'mode','') not in ('bus','flight','boat','taxi','walk','local','mixed')
      or jsonb_typeof(v_item->'notes') is distinct from 'string' or char_length(v_item->>'notes') > 1500 then raise exception 'Invalid transport reference'; end if;
    foreach v_key in array array['durationLabel','priceLabel'] loop
      if coalesce(jsonb_typeof(v_item->v_key),'missing') not in ('string','null') or char_length(v_item->>v_key) > 300 then raise exception 'Invalid transport label'; end if;
    end loop;
  end loop;
  -- Lock the canonical row first: serializes first-save races as well as later revisions.
  select * into v_catalog from public.catalog_experiences where id = p_experience_id for update;
  if not found then raise exception 'Unknown experience'; end if;
  if v_catalog.updated_at is distinct from p_expected_catalog_updated_at then raise exception 'Catalog changed; reload review' using errcode = '40001'; end if;
  select * into v_draft from public.editorial_drafts where experience_id = p_experience_id for update;
  if coalesce(v_draft.revision,0) <> p_expected_revision then raise exception 'Draft changed; reload review' using errcode = '40001'; end if;
  v_revision := coalesce(v_draft.revision,0) + 1;
  v_content := v_catalog.data || (p_patch - 'price' - 'locationInfo');
  v_content := v_content || jsonb_build_object('price', (v_catalog.data->'price') || v_price || jsonb_build_object('type','referential'),
    'locationInfo', coalesce(v_catalog.data->'locationInfo','{"references":[]}'::jsonb) || v_location,
    'id',v_catalog.id, 'bookingEnabled',false, 'operatorVerificationStatus','unverified', 'verifiedBy',null,
    'geospatialCoordinatesVerified',false, 'editorialStatus','referential');
  insert into public.editorial_drafts(experience_id,revision,content,source_note,status,base_catalog_updated_at,updated_by,updated_at)
    values(p_experience_id,v_revision,v_content,trim(p_source_note),'in_review',v_catalog.updated_at,auth.uid(),clock_timestamp())
    on conflict (experience_id) do update set revision=excluded.revision,content=excluded.content,source_note=excluded.source_note,
      status='in_review',base_catalog_updated_at=excluded.base_catalog_updated_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at
    returning * into v_draft;
  insert into public.editorial_audit(experience_id,revision,actor_id,action,note,content_hash)
    values(p_experience_id,v_revision,auth.uid(),'draft_saved',trim(p_source_note),md5(v_content::text));
  return to_jsonb(v_draft) - 'updated_by';
end;
$$;

create function public.review_editorial_draft(p_experience_id text,p_expected_revision bigint,p_decision text,p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_draft public.editorial_drafts;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_decision not in ('changes_requested','ready_for_legal') or char_length(trim(coalesce(p_note,''))) not between 10 and 2000 then raise exception 'Review decision and note required'; end if;
  select * into v_draft from public.editorial_drafts where experience_id=p_experience_id for update;
  if not found or v_draft.revision is distinct from p_expected_revision then raise exception 'Draft changed; reload review' using errcode='40001'; end if;
  update public.editorial_drafts set status=p_decision,updated_at=clock_timestamp() where experience_id=p_experience_id;
  insert into public.editorial_audit(experience_id,revision,actor_id,action,note,content_hash)
    values(p_experience_id,v_draft.revision,auth.uid(),p_decision,trim(p_note),md5(v_draft.content::text));
end;
$$;

create function public.publish_editorial_draft(p_experience_id text,p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_draft public.editorial_drafts;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  select * into v_draft from public.editorial_drafts where experience_id=p_experience_id for update;
  if not found or v_draft.revision is distinct from p_expected_revision then raise exception 'Draft changed; reload review' using errcode='40001'; end if;
  -- No caller-supplied boolean or editable metadata can pretend to approve legal policies.
  -- A future reviewed migration must implement legal version matching and release procedure.
  insert into public.editorial_audit(experience_id,revision,actor_id,action,note,content_hash)
    values(p_experience_id,v_draft.revision,auth.uid(),'publication_blocked','Legal review and release workflow are not configured.',md5(v_draft.content::text));
  return jsonb_build_object('published',false,'reason','Revisión legal y procedimiento de publicación pendientes; el catálogo público no cambió.');
end;
$$;
revoke all on function public.save_editorial_draft(text,jsonb,text,bigint,timestamptz), public.review_editorial_draft(text,bigint,text,text), public.publish_editorial_draft(text,bigint) from public,anon,authenticated;
grant execute on function public.save_editorial_draft(text,jsonb,text,bigint,timestamptz), public.review_editorial_draft(text,bigint,text,text), public.publish_editorial_draft(text,bigint) to authenticated;
commit;
