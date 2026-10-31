'use strict';
const {calculateInvoice,assertDate} = require('./calculator.cjs');
const {nextBillingDate} = require('./recurrence.cjs');

// This orchestration requires a real PostgreSQL atomic adapter for production use.
// It is NOT a scheduler and cannot guarantee DB idempotency without the SQL constraint/transaction.
async function runDueBilling({repository, asOf, policy, batchSize=100, maxPeriodsPerSubscription=24}) {
  assertDate(asOf, 'asOf');
  if (!repository || typeof repository.listDueSubscriptionIds !== 'function' ||
      typeof repository.getBillingSnapshot !== 'function' ||
      typeof repository.persistInvoiceAtomically !== 'function') {
    throw new TypeError('A transactional billing repository with all three required methods is necessary');
  }
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new RangeError('Invalid batchSize');
  if (!Number.isSafeInteger(maxPeriodsPerSubscription) || maxPeriodsPerSubscription < 1 || maxPeriodsPerSubscription > 120) throw new RangeError('Invalid maxPeriodsPerSubscription');
  const ids=await repository.listDueSubscriptionIds({asOf,limit:batchSize});
  if (!Array.isArray(ids)) throw new TypeError('Repository must return an array of due IDs');
  const summary={created:0,alreadyExists:0,failed:[],backlog:[],inspected:0};
  for (const subscriptionId of new Set(ids)) {
    summary.inspected++;
    let attempted=0;
    try {
      let snapshot=await repository.getBillingSnapshot(subscriptionId);
      while(snapshot && snapshot.status==='active' && snapshot.nextBillingDate<=asOf && attempted<maxPeriodsPerSubscription) {
        const current=assertDate(snapshot.nextBillingDate,'nextBillingDate');
        const next=nextBillingDate(current,snapshot.frequency,snapshot.anchorDate);
        if(next<=current)throw new Error('Billing cursor failed to advance');
        const invoice=calculateInvoice({
          subscriptionId,customerId:snapshot.customerId,periodStart:current,currency:snapshot.currency,
          lines:snapshot.lines,discounts:snapshot.discounts || [],policy
        });
        invoice.billingPeriodEndExclusive=next;
        const outcome=await repository.persistInvoiceAtomically({
          subscriptionId,expectedNextBillingDate:current,nextBillingDate:next,
          invoice,idempotencyKey:subscriptionId+':'+current,
          discountRedemptionIds:invoice.appliedDiscounts.map(d=>d.id)
        });
        if(!outcome || !['created','already-exists'].includes(outcome.status))throw new Error('Atomic persistence adapter returned an invalid result');
        if(outcome.status==='created')summary.created++; else summary.alreadyExists++;
        attempted++;
        const refreshed=await repository.getBillingSnapshot(subscriptionId);
        if(refreshed && refreshed.nextBillingDate<=current)throw new Error('Atomic persistence did not advance billing cursor');
        snapshot=refreshed;
      }
      if(snapshot && snapshot.status==='active' && snapshot.nextBillingDate<=asOf)summary.backlog.push(subscriptionId);
    }catch(error){
      summary.failed.push({subscriptionId,reason:error && error.message ? error.message : 'unknown failure'});
    }
  }
  return summary;
}
module.exports={runDueBilling};
