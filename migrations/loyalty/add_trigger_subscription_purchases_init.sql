-- Initialize subscription_purchases from subscription_plans defaults
-- Also enforce expiry status on updates

create or replace function public.fn_init_subscription_purchase_from_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  start_ts timestamptz;
begin
  -- Load plan
  select * into p from public.subscription_plans where id = new.plan_id;
  if not found then
    raise exception 'Plan % not found', new.plan_id using errcode = 'P0001';
  end if;

  -- Default status
  if new.status is null then
    new.status := 'active';
  end if;

  -- Compute expiry_date if duration_days present
  start_ts := coalesce(new.start_date, now());
  if p.duration_days is not null then
    new.expiry_date := start_ts + (p.duration_days || ' days')::interval;
  end if;

  -- Initialize remaining fields based on plan type
  if p.type in ('visit','package') then
    if new.remaining_visits is null then
      new.remaining_visits := p.max_redemptions;
    end if;
  elsif p.type = 'credit' then
    if new.remaining_value is null then
      new.remaining_value := coalesce(p.price, 0);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_init_subscription_purchase_from_plan on public.subscription_purchases;

create trigger trg_init_subscription_purchase_from_plan
before insert on public.subscription_purchases
for each row
execute procedure public.fn_init_subscription_purchase_from_plan();

-- Expire on update if expiry_date passed
create or replace function public.fn_expire_subscription_on_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expiry_date is not null and new.expiry_date < now() then
    new.status := 'expired';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_expire_subscription_on_update on public.subscription_purchases;

create trigger trg_expire_subscription_on_update
before update on public.subscription_purchases
for each row
execute procedure public.fn_expire_subscription_on_update();


