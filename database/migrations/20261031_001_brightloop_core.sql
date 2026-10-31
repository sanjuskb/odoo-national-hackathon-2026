-- BRIGHTLOOP CORE SCHEMA — PROPOSED, REVIEW REQUIRED BY HARSHA
-- Requires existing Supabase Auth and fresh development schema. Apply ONCE in order.
-- This migration has NOT been executed against the team's live Supabase project.
-- Avoid running against databases with pre-existing tables until Harsha reviews compatibility.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'customer' check (role in ('admin','staff','customer')),
  created_at timestamptz not null default now()
);

-- Auth trigger forces customer role; sign-up metadata cannot set 'admin' or 'staff'.
create or replace function public.create_customer_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null then raise exception 'Brightloop requires email registration'; end if;
  insert into public.profiles(id,email,full_name,role)
  values (new.id,lower(new.email),new.raw_user_meta_data->>'full_name','customer');
  return new;
end;
$$;
create trigger brightloop_auth_profile_created
after insert on auth.users for each row execute function public.create_customer_profile();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name))>0),
  type text not null,
  sales_price numeric(14,2) not null check(sales_price>=0),
  cost_price numeric(14,2) not null check(cost_price>=0),
  notes text,
  created_at timestamptz not null default now()
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check(length(trim(name))>0),
  price_adjustment numeric(14,2) not null default 0,
  unique(product_id,name)
);
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  name text not null,
  price numeric(14,2) not null check(price>=0),
  currency char(3) not null,
  frequency text not null check(frequency in ('daily','weekly','monthly','yearly')),
  min_quantity integer not null default 1 check(min_quantity>0),
  available_from date,
  available_until date,
  auto_close boolean not null default false,
  allow_early_close boolean not null default false,
  allow_pause boolean not null default false,
  allow_renew boolean not null default false,
  created_at timestamptz not null default now(),
  check(available_until is null or available_from is null or available_until>=available_from)
);
create table public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate_percent numeric(5,2) not null check(rate_percent between 0 and 100),
  description text,
  is_active boolean not null default true
);
create table public.quotation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_id uuid not null references public.plans(id),
  validity_days integer not null check(validity_days>0),
  created_at timestamptz not null default now()
);
create table public.quotation_template_lines (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quotation_templates(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity integer not null check(quantity>0)
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_number text not null unique,
  customer_id uuid not null references public.profiles(id),
  plan_id uuid not null references public.plans(id),
  template_id uuid references public.quotation_templates(id),
  start_date date not null,
  expiry_date date,
  payment_terms text,
  status text not null default 'draft' check(status in ('draft','quotation','confirmed','active','paused','closed')),
  next_billing_date date,
  billing_anchor_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(expiry_date is null or expiry_date>=start_date),
  check(next_billing_date is null or next_billing_date>=start_date)
);
create table public.subscription_lines (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity integer not null check(quantity>0),
  unit_price numeric(14,2) not null check(unit_price>=0),
  tax_rate_percent numeric(5,2) not null default 0 check(tax_rate_percent between 0 and 100)
);
create table public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check(kind in ('fixed','percentage')),
  value numeric(14,2) not null check(value>=0),
  scope text not null check(scope in ('product','subscription')),
  min_amount numeric(14,2) check(min_amount>=0),
  min_quantity integer check(min_quantity>0),
  valid_from date,
  valid_until date,
  max_uses integer check(max_uses>=0),
  used_count integer not null default 0 check(used_count>=0),
  created_at timestamptz not null default now(),
  check(valid_until is null or valid_from is null or valid_until>=valid_from),
  check(kind <> 'percentage' or value<=100),
  check(max_uses is null or used_count<=max_uses)
);
create table public.discount_product_mappings (
  discount_rule_id uuid not null references public.discount_rules(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key(discount_rule_id,product_id)
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id),
  customer_id uuid not null references public.profiles(id),
  billing_period_start date not null,
  billing_period_end_exclusive date not null,
  due_date date not null,
  currency char(3) not null,
  status text not null default 'draft' check(status in ('draft','confirmed','paid','cancelled')),
  subtotal numeric(14,2) not null check(subtotal>=0),
  discount_total numeric(14,2) not null default 0 check(discount_total>=0),
  tax_total numeric(14,2) not null default 0 check(tax_total>=0),
  total numeric(14,2) not null check(total>=0),
  created_at timestamptz not null default now(),
  unique(subscription_id,billing_period_start),
  check(billing_period_end_exclusive>billing_period_start)
);
create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id),
  description text not null,
  quantity integer not null check(quantity>0),
  unit_price numeric(14,2) not null check(unit_price>=0),
  variant_adjustment numeric(14,2) not null default 0,
  base_amount numeric(14,2) not null check(base_amount>=0),
  discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
  tax_percent numeric(5,2) not null check(tax_percent between 0 and 100),
  tax_amount numeric(14,2) not null default 0 check(tax_amount>=0),
  line_total numeric(14,2) not null check(line_total>=0)
);
create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_rule_id uuid not null references public.discount_rules(id),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null check(amount>=0),
  unique(discount_rule_id,invoice_id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  amount numeric(14,2) not null check(amount>0),
  method text not null,
  paid_at timestamptz not null,
  note text,
  external_reference text,
  created_at timestamptz not null default now()
);
create unique index payments_external_ref_unique on public.payments(invoice_id,external_reference) where external_reference is not null;
create index subscription_due_idx on public.subscriptions(next_billing_date) where status='active';
create index subscriptions_customer_idx on public.subscriptions(customer_id);
create index subscriptions_plan_idx on public.subscriptions(plan_id);
create index invoices_customer_idx on public.invoices(customer_id);
create index invoices_due_status_idx on public.invoices(due_date,status);
create index invoice_lines_invoice_idx on public.invoice_lines(invoice_id);
create index payments_invoice_idx on public.payments(invoice_id);
create index discount_redemptions_invoice_idx on public.discount_redemptions(invoice_id);

-- Internal roles are looked up using a tightly scoped definer function to avoid RLS recursion.
create or replace function public.is_brightloop_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p
    where p.id=auth.uid() and p.role in ('admin','staff'));
$$;
revoke all on function public.is_brightloop_staff() from public;
grant execute on function public.is_brightloop_staff() to authenticated;

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated
  using(id=auth.uid() or public.is_brightloop_staff());

alter table public.products enable row level security;
create policy products_read on public.products for select to authenticated using(true);
alter table public.product_variants enable row level security;
create policy variants_read on public.product_variants for select to authenticated using(true);
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to authenticated using(true);
alter table public.tax_rules enable row level security;
create policy taxes_read_internal on public.tax_rules for select to authenticated using(public.is_brightloop_staff());
alter table public.quotation_templates enable row level security;
create policy templates_read_internal on public.quotation_templates for select to authenticated using(public.is_brightloop_staff());
alter table public.quotation_template_lines enable row level security;
create policy template_lines_read_internal on public.quotation_template_lines for select to authenticated using(public.is_brightloop_staff());
alter table public.discount_rules enable row level security;
create policy discounts_read_internal on public.discount_rules for select to authenticated using(public.is_brightloop_staff());
alter table public.discount_product_mappings enable row level security;
create policy discount_product_read_internal on public.discount_product_mappings for select to authenticated using(public.is_brightloop_staff());

alter table public.subscriptions enable row level security;
create policy subscription_read on public.subscriptions for select to authenticated
  using(customer_id=auth.uid() or public.is_brightloop_staff());
alter table public.subscription_lines enable row level security;
create policy subscription_lines_read on public.subscription_lines for select to authenticated
  using(exists(select 1 from public.subscriptions s where s.id=subscription_id
      and (s.customer_id=auth.uid() or public.is_brightloop_staff())));
alter table public.invoices enable row level security;
create policy invoices_read on public.invoices for select to authenticated
  using(customer_id=auth.uid() or public.is_brightloop_staff());
alter table public.invoice_lines enable row level security;
create policy invoice_lines_read on public.invoice_lines for select to authenticated
  using(exists(select 1 from public.invoices i where i.id=invoice_id
      and (i.customer_id=auth.uid() or public.is_brightloop_staff())));
alter table public.payments enable row level security;
create policy payments_read on public.payments for select to authenticated
  using(exists(select 1 from public.invoices i where i.id=invoice_id
      and (i.customer_id=auth.uid() or public.is_brightloop_staff())));
alter table public.discount_redemptions enable row level security;
create policy discount_redemptions_read_internal on public.discount_redemptions for select to authenticated
  using(public.is_brightloop_staff());

-- Deliberately NO client INSERT/UPDATE/DELETE policies.
-- Only trusted server-side role-controlled operations may mutate financial records;
-- Supabase service_role bypasses RLS and MUST NOT be exposed to browsers or AI agents.
