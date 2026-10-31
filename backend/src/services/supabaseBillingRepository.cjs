'use strict';
const {assertDate} = require('../../../billing/src/calculator.cjs');

// Server-only Supabase PostgREST adapter. Requires Harsha's approved migrations.
// No secrets are ever written to the frontend or returned in errors.
function createSupabaseBillingRepository({env=process.env,http=globalThis.fetch}={}) {
  const base=(env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!/^https:\/\/[^/]+\.supabase\.co$/.test(base) || !key)
    throw Error('Server-side Supabase URL and service key are not configured');
  if(!Number.isInteger(Number(env.BILLING_DUE_DAYS)) || env.BILLING_DUE_DAYS==='' ||
     Number(env.BILLING_DUE_DAYS)<0 || Number(env.BILLING_DUE_DAYS)>365)
    throw Error('BILLING_DUE_DAYS must be explicitly approved and configured 0..365');
  if(typeof http!=='function')throw Error('Fetch implementation unavailable');
  const dueDays=Number(env.BILLING_DUE_DAYS);
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function safeId(id) {if(typeof id!=='string'||!uuid.test(id))throw Error('Invalid UUID');return id;}
  function decimal(value,label) {
    if(typeof value==='number' && (!Number.isFinite(value)||Math.abs(value)>1e12))throw Error(label+' numeric value out of safe serialization range');
    const s=String(value);
    if(!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s))throw Error(label+' was not a precise two-decimal value');
    return s;
  }
  async function request(path,{method='GET',body}={}) {
    const url=base+'/rest/v1/'+path;
    const response=await http(url,{method,headers:{
      apikey:key,Authorization:'Bearer '+key,Accept:'application/json','Content-Type':'application/json',
      ...(method==='POST'?{Prefer:'return=representation'}:{})
    },...(body!==undefined?{body:JSON.stringify(body)}:{})});
    if(!response.ok)throw Error('Supabase persistence request failed ('+response.status+')');
    return await response.json();
  }
  async function listDueSubscriptionIds({asOf,limit}) {
    assertDate(asOf,'asOf');
    if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw Error('Invalid billing batch limit');
    const rows=await request('subscriptions?select=id&status=eq.active&next_billing_date=lte.'+asOf+'&order=next_billing_date.asc&limit='+limit);
    if(!Array.isArray(rows))throw Error('Unexpected subscriptions response');
    return rows.map(r=>safeId(r.id));
  }
  async function getBillingSnapshot(id) {
    safeId(id);
    const subs=await request('subscriptions?select=id,status,customer_id,plan_id,start_date,next_billing_date,billing_anchor_date&id=eq.'+id+'&limit=1');
    if(!Array.isArray(subs)||!subs.length)return null;
    const s=subs[0];
    const plans=await request('plans?select=id,frequency,currency&id=eq.'+safeId(s.plan_id)+'&limit=1');
    if(!Array.isArray(plans)||plans.length!==1)throw Error('Subscription plan missing');
    const plan=plans[0];
    const rows=await request('subscription_lines?select=product_id,description,quantity,unit_price,variant_adjustment,tax_rate_percent&subscription_id=eq.'+id);
    if(!Array.isArray(rows)||rows.length===0)throw Error('Subscription has no lines');
    const rules=await request('discount_rules?select=id,kind,value,scope,min_amount,min_quantity,valid_from,valid_until,max_uses,used_count&limit=1000');
    if(!Array.isArray(rules))throw Error('Invalid discount rules response');
    if(rules.length===1000)throw Error('Discount pagination required before safe billing');
    const scoped=rules.filter(r=>r.scope==='product');
    let mappings=[];
    if(scoped.length){
      const ids=scoped.map(r=>safeId(r.id)).join(',');
      mappings=await request('discount_product_mappings?select=discount_rule_id,product_id&discount_rule_id=in.('+ids+')');
    }
    if(!Array.isArray(mappings))throw Error('Invalid discount mappings');
    const discounts=rules.map(r=>({
      id:safeId(r.id),kind:r.kind,value:decimal(r.value,'discount'),
      scope:r.scope,minAmount:r.min_amount===null?undefined:decimal(r.min_amount,'minimum'),
      minQuantity:r.min_quantity??undefined,validFrom:r.valid_from??undefined,
      validUntil:r.valid_until??undefined,maxUses:r.max_uses??undefined,
      usedCount:r.used_count??0,
      productIds:r.scope==='product'?mappings.filter(m=>m.discount_rule_id===r.id).map(m=>m.product_id):undefined
    }));
    return {status:s.status,customerId:s.customer_id,frequency:plan.frequency,currency:plan.currency,
      nextBillingDate:s.next_billing_date,anchorDate:s.billing_anchor_date||s.start_date,
      lines:rows.map(r=>({productId:r.product_id,title:r.description,quantity:r.quantity,
        unitPrice:decimal(r.unit_price,'unit price'),variantAdjustment:decimal(r.variant_adjustment,'variant price'),
        taxPercent:decimal(r.tax_rate_percent,'tax percent')})),
      discounts
    };
  }
  async function persistInvoiceAtomically({subscriptionId,expectedNextBillingDate,nextBillingDate,invoice}) {
    safeId(subscriptionId);
    assertDate(expectedNextBillingDate,'expectedNextBillingDate');
    assertDate(nextBillingDate,'nextBillingDate');
    const date=new Date(expectedNextBillingDate+'T00:00:00Z');
    date.setUTCDate(date.getUTCDate()+dueDays);
    const rows=await request('rpc/persist_due_billing_invoice',{method:'POST',body:{
      p_subscription_id:subscriptionId,p_expected_date:expectedNextBillingDate,
      p_next_date:nextBillingDate,p_due_date:date.toISOString().slice(0,10),
      p_subtotal:invoice.subtotal,p_tax_total:invoice.taxTotal,p_discount_total:invoice.discountTotal,
      p_total:invoice.total,p_lines:invoice.invoiceLines,p_discounts:invoice.appliedDiscounts
    }});
    const first=Array.isArray(rows)?rows[0]:rows;
    if(!first||!['created','already-exists'].includes(first.result_status))throw Error('Unexpected atomic RPC result');
    return {status:first.result_status,invoiceId:first.result_invoice_id};
  }
  return {listDueSubscriptionIds,getBillingSnapshot,persistInvoiceAtomically};
}
module.exports={createSupabaseBillingRepository};
