'use strict';
const {assertDate}=require('../../../billing/src/calculator.cjs');
function getDefaultSupabaseAdmin() {
  return require('../lib/supabase').getSupabaseAdmin();
}

// Reuses Amarnadh's server-only Supabase Admin SDK; never instantiates browser secrets.
function createSupabaseBillingRepository({client,env=process.env}={}) {
  const activeClient = client || getDefaultSupabaseAdmin();
  if(!/^\d{1,3}$/.test(env.BILLING_DUE_DAYS||'')||Number(env.BILLING_DUE_DAYS)>365)
    throw Error('BILLING_DUE_DAYS must be explicitly approved and configured 0..365');
  const dueDays=Number(env.BILLING_DUE_DAYS);
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function safeId(id){if(typeof id!=='string'||!uuid.test(id))throw Error('Invalid UUID');return id;}
  function decimal(value,label){
    if(typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>1e12))throw Error(label+' out of safe serialization range');
    const s=String(value);
    if(!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s))throw Error(label+' must have no more than two decimal places');
    return s;
  }
  function requireData({data,error},label){
    if(error)throw Error('Supabase operation failed: '+label);
    return data;
  }
  async function listDueSubscriptionIds({asOf,limit}){
    assertDate(asOf,'asOf');
    if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw Error('Invalid batch limit');
    const data=requireData(await activeClient.from('subscriptions').select('id')
      .eq('status','active').lte('next_billing_date',asOf)
      .order('next_billing_date',{ascending:true}).limit(limit),'due list');
    if(!Array.isArray(data))throw Error('Invalid due-list response');
    return data.map(r=>safeId(r.id));
  }
  async function getBillingSnapshot(id){
    safeId(id);
    const s=requireData(await activeClient.from('subscriptions')
      .select('id,status,customer_id,plan_id,start_date,next_billing_date,billing_anchor_date')
      .eq('id',id).maybeSingle(),'subscription');
    if(!s)return null;
    const p=requireData(await activeClient.from('plans').select('id,frequency,currency')
      .eq('id',safeId(s.plan_id)).single(),'plan');
    const rows=requireData(await activeClient.from('subscription_lines')
      .select('product_id,description,quantity,unit_price,variant_adjustment,tax_rate_percent')
      .eq('subscription_id',id),'subscription lines');
    if(!p||!Array.isArray(rows)||!rows.length)throw Error('Incomplete subscription/plan snapshot');
    const rules=requireData(await activeClient.from('discount_rules')
      .select('id,kind,value,scope,min_amount,min_quantity,valid_from,valid_until,max_uses,used_count')
      .limit(1000),'discount rules');
    if(!Array.isArray(rules)||rules.length>=1000)throw Error('Discount-rule pagination required; refusing partial rules');
    const scoped=rules.filter(r=>r.scope==='product');
    let maps=[];
    if(scoped.length){
      maps=requireData(await activeClient.from('discount_product_mappings')
        .select('discount_rule_id,product_id').in('discount_rule_id',scoped.map(r=>safeId(r.id))),'product discount scope');
    }
    if(!Array.isArray(maps))throw Error('Invalid product discount scopes');
    return {
      status:s.status,customerId:s.customer_id,frequency:p.frequency,currency:p.currency,
      nextBillingDate:s.next_billing_date,anchorDate:s.billing_anchor_date||s.start_date,
      lines:rows.map(r=>({
        productId:safeId(r.product_id),title:r.description,quantity:r.quantity,
        unitPrice:decimal(r.unit_price,'unit_price'),
        variantAdjustment:decimal(r.variant_adjustment,'variant_adjustment'),
        taxPercent:decimal(r.tax_rate_percent,'tax_rate_percent')
      })),
      discounts:rules.map(r=>({
        id:safeId(r.id),kind:r.kind,value:decimal(r.value,'discount value'),scope:r.scope,
        minAmount:r.min_amount===null?undefined:decimal(r.min_amount,'discount minimum'),
        minQuantity:r.min_quantity??undefined,validFrom:r.valid_from??undefined,validUntil:r.valid_until??undefined,
        maxUses:r.max_uses??undefined,usedCount:r.used_count??0,
        productIds:r.scope==='product'?maps.filter(m=>m.discount_rule_id===r.id).map(m=>m.product_id):undefined
      }))
    };
  }
  async function persistInvoiceAtomically({subscriptionId,expectedNextBillingDate,nextBillingDate,invoice}){
    safeId(subscriptionId);assertDate(expectedNextBillingDate,'expectedNextBillingDate');assertDate(nextBillingDate,'nextBillingDate');
    const date=new Date(expectedNextBillingDate+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+dueDays);
    const rows=requireData(await activeClient.rpc('persist_due_billing_invoice',{
      p_subscription_id:subscriptionId,p_expected_date:expectedNextBillingDate,p_next_date:nextBillingDate,
      p_due_date:date.toISOString().slice(0,10),p_subtotal:invoice.subtotal,
      p_tax_total:invoice.taxTotal,p_discount_total:invoice.discountTotal,
      p_total:invoice.total,p_lines:invoice.invoiceLines,p_discounts:invoice.appliedDiscounts
    }),'atomic invoice');
    const value=Array.isArray(rows)?rows[0]:rows;
    if(!value||!['created','already-exists'].includes(value.result_status))throw Error('Atomic invoice RPC returned invalid result');
    return {status:value.result_status,invoiceId:value.result_invoice_id};
  }
  return {listDueSubscriptionIds,getBillingSnapshot,persistInvoiceAtomically};
}
module.exports={createSupabaseBillingRepository};
