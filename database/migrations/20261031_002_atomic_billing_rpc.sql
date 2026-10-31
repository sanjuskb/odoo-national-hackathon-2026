-- BRIGHTLOOP ATOMIC BILLING RPC — PROPOSED, MUST BE REVIEWED BY HARSHA
-- Depends on 20261031_001_brightloop_core.sql.
-- Not executed against live Supabase. Test using two customers and concurrent workers before acceptance.
--
-- Invoke ONLY from trusted backend using server-held service_role credentials.
-- One RPC call is one PostgreSQL transaction: rollback on ANY error.
create or replace function public.persist_due_billing_invoice(
  p_subscription_id uuid,
  p_expected_date date,
  p_next_date date,
  p_due_date date,
  p_subtotal numeric,
  p_tax_total numeric,
  p_discount_total numeric,
  p_total numeric,
  p_lines jsonb,
  p_discounts jsonb default '[]'::jsonb
)
returns table(result_status text,result_invoice_id uuid)
language plpgsql security definer set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_invoice_id uuid;
  v_existing_id uuid;
  v_line jsonb;
  v_discount jsonb;
  v_rule public.discount_rules%rowtype;
  v_amount numeric;
  v_sum_total numeric := 0;
  v_sum_base numeric := 0;
  v_sum_discount numeric := 0;
  v_sum_tax numeric := 0;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'Only trusted service_role may execute billing RPC' using errcode='42501';
  end if;
  if p_expected_date is null or p_next_date is null or p_next_date<=p_expected_date or p_due_date is null then
    raise exception 'Invalid billing dates';
  end if;
  if p_subtotal is null or p_tax_total is null or p_discount_total is null or p_total is null
    or p_subtotal<0 or p_tax_total<0 or p_discount_total<0 or p_total<0 then
    raise exception 'Invalid invoice monetary totals';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines)=0
     or jsonb_typeof(p_discounts)<>'array' then
    raise exception 'Invoice lines/discount redemptions must be JSON arrays';
  end if;

  select * into v_sub from public.subscriptions
    where id=p_subscription_id for update;
  if not found then raise exception 'Unknown subscription'; end if;
  if v_sub.status <> 'active' then raise exception 'Subscription must be active'; end if;
  if v_sub.next_billing_date <> p_expected_date then
    select id into v_existing_id from public.invoices
      where subscription_id=p_subscription_id and billing_period_start=p_expected_date;
    if v_existing_id is not null and v_sub.next_billing_date>p_expected_date then
      return query select 'already-exists'::text,v_existing_id;
      return;
    end if;
    raise exception 'Stale billing cursor or unsupported partial billing state';
  end if;

  for v_line in select value from jsonb_array_elements(p_lines) as item(value) loop
    if (v_line->>'quantity')::integer<=0
       or (v_line->>'baseAmount')::numeric<0
       or (v_line->>'discountAmount')::numeric<0
       or (v_line->>'taxAmount')::numeric<0
       or (v_line->>'lineTotal')::numeric<0 then
      raise exception 'Invalid invoice line values';
    end if;
    v_sum_total := v_sum_total+(v_line->>'lineTotal')::numeric;
    v_sum_base := v_sum_base+(v_line->>'baseAmount')::numeric;
    v_sum_discount := v_sum_discount+(v_line->>'discountAmount')::numeric;
    v_sum_tax := v_sum_tax+(v_line->>'taxAmount')::numeric;
  end loop;
  if v_sum_total <> p_total or v_sum_base <> p_subtotal
    or v_sum_discount <> p_discount_total or v_sum_tax <> p_tax_total then
    raise exception 'Invoice snapshot totals do not reconcile';
  end if;

  -- Lock discount rows in deterministic UUID order to prevent concurrent cap races.
  for v_discount in
    select value from jsonb_array_elements(p_discounts) as item(value)
    order by (value->>'id')
  loop
    select * into v_rule from public.discount_rules
      where id=(v_discount->>'id')::uuid for update;
    if not found then raise exception 'Unknown discount rule'; end if;
    if v_rule.max_uses is not null and v_rule.used_count>=v_rule.max_uses then
      raise exception 'Discount usage cap exhausted';
    end if;
    if (v_discount->>'amount')::numeric<=0 then raise exception 'Invalid discount redemption amount'; end if;
  end loop;

  insert into public.invoices(
    subscription_id,customer_id,billing_period_start,billing_period_end_exclusive,
    due_date,currency,status,subtotal,discount_total,tax_total,total
  )
  select v_sub.id,v_sub.customer_id,p_expected_date,p_next_date,p_due_date,
         p.currency,'draft',p_subtotal,p_discount_total,p_tax_total,p_total
    from public.plans p where p.id=v_sub.plan_id
    returning id into v_invoice_id;

  if v_invoice_id is null then raise exception 'Subscription plan missing'; end if;
  for v_line in select value from jsonb_array_elements(p_lines) as item(value) loop
    insert into public.invoice_lines(
      invoice_id,product_id,description,quantity,unit_price,variant_adjustment,
      base_amount,discount_amount,tax_percent,tax_amount,line_total
    ) values (
      v_invoice_id,(v_line->>'productId')::uuid,v_line->>'title',
      (v_line->>'quantity')::integer,(v_line->>'unitPrice')::numeric,
      (v_line->>'variantAdjustment')::numeric,
      (v_line->>'baseAmount')::numeric,(v_line->>'discountAmount')::numeric,
      (v_line->>'taxPercent')::numeric,(v_line->>'taxAmount')::numeric,
      (v_line->>'lineTotal')::numeric
    );
  end loop;
  for v_discount in
    select value from jsonb_array_elements(p_discounts) as item(value)
    order by (value->>'id')
  loop
    v_amount := (v_discount->>'amount')::numeric;
    update public.discount_rules set used_count=used_count+1
      where id=(v_discount->>'id')::uuid;
    insert into public.discount_redemptions(discount_rule_id,invoice_id,amount)
      values ((v_discount->>'id')::uuid,v_invoice_id,v_amount);
  end loop;
  update public.subscriptions set next_billing_date=p_next_date, updated_at=now()
    where id=p_subscription_id and next_billing_date=p_expected_date;
  if not found then raise exception 'Billing cursor update failed'; end if;

  return query select 'created'::text,v_invoice_id;
end;
$$;

-- REVOKE PUBLIC: only trusted backend service_role may invoke this atomic workflow.
revoke all on function public.persist_due_billing_invoice(uuid,date,date,date,numeric,numeric,numeric,numeric,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.persist_due_billing_invoice(uuid,date,date,date,numeric,numeric,numeric,numeric,jsonb,jsonb)
  to service_role;
