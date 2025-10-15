-- Enforce eligibility BEFORE insert and apply accounting AFTER insert for loyalty_visits
-- Handles visit/package (remaining_visits) and credit (remaining_value) plans

create or replace function public.fn_enforce_loyalty_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sp record;
  pl record;
begin
  -- Only enforce for redemption rows tied to a purchase
  if new.visit_type = 'redemption' and new.purchase_id is not null then
    select * into sp from public.subscription_purchases where id = new.purchase_id;
    if not found then
      raise exception 'Subscription purchase % not found', new.purchase_id using errcode = 'P0001';
    end if;

    select * into pl from public.subscription_plans where id = sp.plan_id;
    if not found then
      raise exception 'Subscription plan % not found for purchase %', sp.plan_id, sp.id using errcode = 'P0001';
    end if;

    -- Status & expiry enforcement
    if sp.status is distinct from 'active' then
      raise exception 'Subscription % is not active (status=%)', sp.id, sp.status using errcode = 'P0001';
    end if;
    if sp.expiry_date is not null and sp.expiry_date < now() then
      raise exception 'Subscription % has expired at %', sp.id, sp.expiry_date using errcode = 'P0001';
    end if;

    -- Type-specific eligibility
    if pl.type in ('visit','package') then
      if coalesce(sp.remaining_visits, 0) <= 0 then
        raise exception 'No remaining visits for subscription %', sp.id using errcode = 'P0001';
      end if;
    elsif pl.type = 'credit' then
      if new.amount_charged is null then
        raise exception 'amount_charged is required for credit redemption' using errcode = 'P0001';
      end if;
      -- Check credit balance from credit_accounts table
      declare
        credit_balance numeric;
      begin
        select balance into credit_balance from public.credit_accounts where customer_id = sp.customer_id;
        if not found or coalesce(credit_balance, 0) < new.amount_charged then
          raise exception 'Insufficient credit: balance % < charge %', coalesce(credit_balance, 0), new.amount_charged using errcode = 'P0001';
        end if;
      end;
    else
      raise exception 'Unsupported plan type %', pl.type using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_loyalty_visit on public.loyalty_visits;

create trigger trg_enforce_loyalty_visit
before insert on public.loyalty_visits
for each row
execute procedure public.fn_enforce_loyalty_visit();


create or replace function public.fn_apply_loyalty_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sp record;
  pl record;
  next_visits integer;
  next_value numeric;
begin
  if new.visit_type = 'redemption' and new.purchase_id is not null then
    select * into sp from public.subscription_purchases where id = new.purchase_id for update;
    select * into pl from public.subscription_plans where id = sp.plan_id;

    if pl.type in ('visit','package') then
      next_visits := greatest(0, coalesce(sp.remaining_visits, 0) - 1);
      update public.subscription_purchases
        set remaining_visits = next_visits,
            status = case when next_visits <= 0 then 'expired' else status end
      where id = sp.id;
    elsif pl.type = 'credit' then
      -- For credit plans, update the credit_accounts table
      update public.credit_accounts
        set balance = balance - coalesce(new.amount_charged, 0)
      where customer_id = sp.customer_id;
      
      -- Check if credit balance is now zero or negative and expire subscription if so
      select balance into next_value from public.credit_accounts where customer_id = sp.customer_id;
      if next_value <= 0 then
        update public.subscription_purchases
          set status = 'expired'
          where id = sp.id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_loyalty_visit on public.loyalty_visits;

create trigger trg_apply_loyalty_visit
after insert on public.loyalty_visits
for each row
execute procedure public.fn_apply_loyalty_visit();


