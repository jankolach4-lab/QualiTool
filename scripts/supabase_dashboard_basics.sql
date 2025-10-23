-- 5) SECURITY DEFINER RPCs
-- Note: Adjust field names if your analytics tables use different names.

-- 5.1 Projects overview: total WE per project, number of users and list of user_ids
create or replace function public.fn_dashboard_projects()
returns table(project text, total_we bigint, user_count integer, users uuid[])
language sql security definer set search_path = public as $$
  select
    coalesce(nullif(ac.ort,''), 'Unbekannt') as project,
    sum(coalesce(ac.we, 1))::bigint as total_we,
    count(distinct ar.user_id)::int as user_count,
    array_agg(distinct ar.user_id) as users
  from public.analytics_residents ar
  join public.analytics_contacts ac on ac.contact_key::text = ar.contact_id::text
  group by 1
  having sum(coalesce(ac.we, 1)) &gt; 0
  order by 1
$$;

-- 5.2 Project users: we_count per user with names/emails
create or replace function public.fn_dashboard_project_users(p_project text)
returns table(user_id uuid, email text, display_name text, we_count bigint)
language sql security definer set search_path = public as $$
  with base as (
    select distinct ar.user_id
    from public.analytics_residents ar
    join public.analytics_contacts ac on ac.contact_key::text = ar.contact_id::text
    where coalesce(nullif(ac.ort,''), 'Unbekannt') = p_project
  )
  select b.user_id,
         ud.email,
         coalesce(ud.display_name, ud.email) as display_name,
         (
           select sum(coalesce(ac2.we, 1))::bigint from public.analytics_residents ar2
           join public.analytics_contacts ac2 on ac2.contact_key::text = ar2.contact_id::text
           where ar2.user_id = b.user_id
             and coalesce(nullif(ac2.ort,''), 'Unbekannt') = p_project
         ) as we_count
  from base b
  left join public.user_directory ud on ud.user_id = b.user_id
  group by b.user_id, ud.email, ud.display_name
  order by display_name nulls last
$$;

-- 5.3 User status breakdown (current)
create or replace function public.fn_dashboard_user_status_breakdown(p_user_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(
    (select case when jsonb_typeof(status_json::jsonb) = 'object' then status_json::jsonb else '{}'::jsonb end
     from public.v_user_status_breakdown_current_json
     where user_id = p_user_id
     limit 1), '{}'::jsonb);
$$;

-- 5.4 Daily user status changes over N days (GLOBAL)
create or replace function public.fn_dashboard_user_daily_changes(p_user_id uuid, p_days int)
returns table(day date, changes integer)
language sql security definer set search_path = public as $$
  select day::date, coalesce(changes,0)::int
  from public.v_daily_user_status_changes
  where user_id = p_user_id
    and day &gt;= (now() - (p_days||' days')::interval)
  order by day asc
$$;

-- 6) Guard all RPCs with admin whitelist
create or replace function public.fn_dashboard_guarded_projects()
returns setof public.fn_dashboard_projects return null on null input
language plpgsql security definer as $$
begin
  perform public.fn_require_admin();
  return query select * from public.fn_dashboard_projects();
end; $$;

create or replace function public.fn_dashboard_guarded_project_users(p_project text)
returns setof public.fn_dashboard_project_users return null on null input
language plpgsql security definer as $$
begin
  perform public.fn_require_admin();
  return query select * from public.fn_dashboard_project_users(p_project);
end; $$;

create or replace function public.fn_dashboard_guarded_user_status_breakdown(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
begin
  perform public.fn_require_admin();
  return (select public.fn_dashboard_user_status_breakdown(p_user_id));
end; $$;

create or replace function public.fn_dashboard_guarded_user_daily_changes(p_user_id uuid, p_days int)
returns setof public.fn_dashboard_user_daily_changes language plpgsql security definer as $$
begin
  perform public.fn_require_admin();
  return query select * from public.fn_dashboard_user_daily_changes(p_user_id, p_days);
end; $$;

-- 7) Grants
grant usage on schema public to anon, authenticated;
grant select on public.user_directory to authenticated;
grant select on public.admin_whitelist to authenticated;

grant execute on function public.fn_dashboard_guarded_projects() to authenticated;
grant execute on function public.fn_dashboard_guarded_project_users(text) to authenticated;
grant execute on function public.fn_dashboard_guarded_user_status_breakdown(uuid) to authenticated;
grant execute on function public.fn_dashboard_guarded_user_daily_changes(uuid, int) to authenticated;

-- Note: add your admin emails
-- insert into public.admin_whitelist(email) values ('dein.admin@example.com');