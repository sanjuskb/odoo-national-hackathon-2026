'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {calculateInvoice,cents,money}=require('../src/calculator.cjs');
const {nextBillingDate}=require('../src/recurrence.cjs');
const policy={taxMode:'exclusive',discountStacking:'best',rounding:'half-up'};
function input(overrides={}) {
  return {subscriptionId:'sub-1',customerId:'customer-1',periodStart:'2026-10-31',currency:'INR',
    lines:[{productId:'p1',title:'Software',quantity:1,unitPrice:'1000.00',variantAdjustment:'560.00',taxPercent:'18.00'}],
    discounts:[],policy,...overrides};
}
test('integer minor unit arithmetic is exact',()=>{
  assert.equal(money(cents('0.10')+cents('0.20')),'0.30');
  assert.throws(()=>cents('0.005'),/at most two/);
  assert.throws(()=>cents('-1.00'),/nonnegative/);
});
test('variant price and 18% tax use exact amounts',()=>{
  const i=calculateInvoice(input());
  assert.equal(i.subtotal,'1560.00');
  assert.equal(i.taxTotal,'280.80');
  assert.equal(i.total,'1840.80');
  assert.equal(i.invoiceLines[0].variantAdjustment,'560.00');
});
test('percentage discount reduces taxable base',()=>{
  const i=calculateInvoice(input({discounts:[{id:'d10',kind:'percentage',value:'10.00',scope:'subscription'}]}));
  assert.equal(i.discountTotal,'156.00');
  assert.equal(i.taxTotal,'252.72');
  assert.equal(i.total,'1656.72');
  assert.deepEqual(i.appliedDiscounts,[{id:'d10',amount:'156.00'}]);
});
test('inclusive tax extracts tax instead of adding it',()=>{
  const i=calculateInvoice(input({lines:[{productId:'p',title:'A',quantity:1,unitPrice:'118.00',taxPercent:'18.00'}],policy:{...policy,taxMode:'inclusive'}}));
  assert.equal(i.total,'118.00');
  assert.equal(i.taxTotal,'18.00');
});
test('fixed discount never creates a negative invoice',()=>{
  const i=calculateInvoice(input({lines:[{productId:'p',title:'A',quantity:1,unitPrice:'100.00',taxPercent:'0'}],discounts:[{id:'big',kind:'fixed',value:'200.00',scope:'subscription'}]}));
  assert.equal(i.discountTotal,'100.00');
  assert.equal(i.total,'0.00');
});
test('best discount picks largest reduction, not both',()=>{
  const i=calculateInvoice(input({lines:[{productId:'p',title:'A',quantity:1,unitPrice:'100.00',taxPercent:'0'}],discounts:[{id:'ten',kind:'percentage',value:'10',scope:'subscription'},{id:'twenty',kind:'fixed',value:'20',scope:'subscription'}]}));
  assert.equal(i.discountTotal,'20.00');assert.equal(i.appliedDiscounts.length,1);
});
test('explicit stacking policy allows ordered discounts',()=>{
  const i=calculateInvoice(input({lines:[{productId:'p',title:'A',quantity:1,unitPrice:'100.00',taxPercent:'0'}],discounts:[{id:'a',kind:'percentage',value:'10',scope:'subscription'},{id:'b',kind:'fixed',value:'5.00',scope:'subscription'}],policy:{...policy,discountStacking:'all'}}));
  assert.equal(i.discountTotal,'15.00');assert.equal(i.total,'85.00');
});
test('discount expiry, usage cap and quantity threshold block ineligible rules',()=>{
  const rules=[{id:'expired',kind:'fixed',value:'50',scope:'subscription',validUntil:'2026-10-30'},
    {id:'used',kind:'fixed',value:'50',scope:'subscription',maxUses:1,usedCount:1},
    {id:'threshold',kind:'fixed',value:'50',scope:'subscription',minQuantity:2}];
  const i=calculateInvoice(input({discounts:rules}));
  assert.equal(i.discountTotal,'0.00');assert.deepEqual(i.appliedDiscounts,[]);
});
test('product-scoped discount only affects selected product',()=>{
  const i=calculateInvoice(input({
    lines:[{productId:'p1',title:'A',quantity:1,unitPrice:'100',taxPercent:'0'},{productId:'p2',title:'B',quantity:1,unitPrice:'100',taxPercent:'0'}],
    discounts:[{id:'p1off',kind:'percentage',value:'10',scope:'product',productIds:['p1']}] }));
  assert.equal(i.discountTotal,'10.00');
  assert.equal(i.invoiceLines[0].discountAmount,'10.00');
  assert.equal(i.invoiceLines[1].discountAmount,'0.00');
});
test('missing policy, tax, invalid date and unsupported quantities rejected',()=>{
  assert.throws(()=>calculateInvoice(input({policy:undefined})),/Approve explicit/);
  assert.throws(()=>calculateInvoice(input({periodStart:'2026-02-30'})),/invalid date/);
  assert.throws(()=>calculateInvoice(input({lines:[{productId:'p',title:'A',quantity:1,unitPrice:'1'}]})),/taxPercent/);
  assert.throws(()=>calculateInvoice(input({lines:[{productId:'p',title:'A',quantity:0,unitPrice:'1',taxPercent:'0'}]})),/positive/);
});
test('recurrence preserves calendar anchor across month ends',()=>{
  assert.equal(nextBillingDate('2026-01-31','monthly'),'2026-02-28');
  assert.equal(nextBillingDate('2026-02-28','monthly','2026-01-31'),'2026-03-31');
  assert.equal(nextBillingDate('2024-02-29','yearly'),'2025-02-28');
  assert.equal(nextBillingDate('2025-02-28','yearly','2024-02-29'),'2026-02-28');
  assert.equal(nextBillingDate('2026-10-31','daily'),'2026-11-01');
  assert.equal(nextBillingDate('2026-10-31','weekly'),'2026-11-07');
  assert.throws(()=>nextBillingDate('2026-10-31','hourly'),/Unsupported/);
});
