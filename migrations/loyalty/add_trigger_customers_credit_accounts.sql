-- Ensure a credit account exists for each customer at insert time
-- Creates an entry in public.credit_accounts for NEW.id if missing

create or replace function public.fn_upsert_credit_account_on_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create credit account if not exists for this customer
  insert into public.credit_accounts (customer_id)
  values (new.id)
  on conflict (customer_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_upsert_credit_account_on_customer on public.customers;

create trigger trg_upsert_credit_account_on_customer
before insert on public.customers
for each row
execute procedure public.fn_upsert_credit_account_on_customer();


