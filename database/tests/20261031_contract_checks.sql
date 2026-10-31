-- READ-ONLY SCHEMA CONTRACT ASSERTIONS — run after applying 001 and 002.
-- These are static checks, not proof of real authorization or concurrency.
do $$
declare v_count integer;
begin
  select count(*) into v_count from information_schema.tables
   where table_schema='public' and table_name in
   ('profiles','products','product_variants','plans','quotation_templates',
   'quotation_template_lines','subscriptions','subscription_lines','invoices',
   'invoice_lines','payments','discount_rules','discount_redemptions','tax_rules');
  if v_count <> 14 then raise exception 'Missing core tables: found % of 14', v_count; end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and tablename='invoices'
      and indexdef like '%UNIQUE%' and indexdef like '%billing_period_start%') then
    raise exception 'Missing invoice billing period uniqueness index';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('subscriptions','invoices','payments','profiles')
      and not c.relrowsecurity) then
    raise exception 'Core customer tables missing RLS';
  end if;
  if to_regprocedure('public.persist_due_billing_invoice(uuid,date,date,date,numeric,numeric,numeric,numeric,jsonb,jsonb)') is null then
    raise exception 'Missing atomic invoice persistence function';
  end if;
  raise notice 'Schema objects and RLS flags present; real two-user/security/concurrency tests still required';
end;
$$;
