'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runDueBilling}=require('../src/runner.cjs');
const policy={taxMode:'exclusive',discountStacking:'best',rounding:'half-up'};
function fakeRepository({failOnce=false}={}){
  const data={id:'s1',status:'active',nextBillingDate:'2026-10-29',anchorDate:'2026-10-29',
    customerId:'c1',currency:'INR',frequency:'daily',
    lines:[{productId:'p1',title:'Service',quantity:1,unitPrice:'10.00',taxPercent:'0'}],discounts:[]};
  const saved=new Map();
  let pendingFail=failOnce;
  return {
    saved,data,
    async listDueSubscriptionIds({asOf}) {return data.nextBillingDate<=asOf?['s1']:[];},
    async getBillingSnapshot() {return {...data,lines:data.lines.map(x=>({...x}))};},
    async persistInvoiceAtomically({invoice,expectedNextBillingDate,nextBillingDate,idempotencyKey}) {
      if(pendingFail){pendingFail=false;throw Error('Simulated DB transaction rollback');}
      if(data.nextBillingDate!==expectedNextBillingDate)throw Error('Stale billing cursor');
      if(saved.has(idempotencyKey))return {status:'already-exists'};
      saved.set(idempotencyKey,invoice);
      data.nextBillingDate=nextBillingDate;
      return {status:'created'};
    }
  };
}
test('bounded catch-up generates each due period exactly once',async()=>{
  const repository=fakeRepository();
  const first=await runDueBilling({repository,asOf:'2026-10-31',policy});
  assert.equal(first.created,3);assert.equal(repository.saved.size,3);
  assert.equal(first.failed.length,0);assert.equal(repository.data.nextBillingDate,'2026-11-01');
  const second=await runDueBilling({repository,asOf:'2026-10-31',policy});
  assert.equal(second.created,0);assert.equal(repository.saved.size,3);
});
test('transient atomic persistence failure can retry without skipping periods',async()=>{
  const repository=fakeRepository({failOnce:true});
  const first=await runDueBilling({repository,asOf:'2026-10-31',policy});
  assert.equal(first.created,0);assert.equal(first.failed.length,1);
  assert.equal(repository.data.nextBillingDate,'2026-10-29');
  assert.equal(repository.saved.size,0);
  const retry=await runDueBilling({repository,asOf:'2026-10-31',policy});
  assert.equal(retry.created,3);assert.equal(repository.saved.size,3);
});
test('catch-up cap reports backlog, not silent success',async()=>{
  const repository=fakeRepository();
  const summary=await runDueBilling({repository,asOf:'2026-10-31',policy,maxPeriodsPerSubscription:1});
  assert.equal(summary.created,1);
  assert.deepEqual(summary.backlog,['s1']);
  assert.equal(repository.data.nextBillingDate,'2026-10-30');
});
test('runner rejects unimplemented/non-atomic adapter',async()=>{
  await assert.rejects(()=>runDueBilling({repository:{},asOf:'2026-10-31',policy}),/transactional billing repository/);
});
test('runner reports broken adapter cursor advancement as failure',async()=>{
  const repository=fakeRepository();
  repository.persistInvoiceAtomically=async()=>({status:'created'});
  const out=await runDueBilling({repository,asOf:'2026-10-31',policy});
  assert.equal(out.failed.length,1);
  assert.match(out.failed[0].reason,/did not advance/);
});
