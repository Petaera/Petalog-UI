-- Periodic expiry job: expire active subscriptions past expiry_date
-- Requires pg_cron or Supabase Scheduled Functions to run periodically

create or replace function public.fn_expire_subscriptions_now()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.subscription_purchases
  set status = 'expired'
  where status = 'active'
    and expiry_date is not null
    and expiry_date < now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Example pg_cron schedule (uncomment and adjust if using pg_cron)
-- select cron.schedule('expire-subscriptions-hourly', '5 * * * *', $$select public.fn_expire_subscriptions_now();$$);


