'use strict';
const express=require('express');
const {runDueBilling}=require('../../../billing/src/runner.cjs');
const {createSupabaseBillingRepository}=require('../services/supabaseBillingRepository.cjs');
const {requireBillingAdmin}=require('../middleware/billingAdmin.cjs');

function createBillingRouter({adminGuard=requireBillingAdmin,repositoryFactory=createSupabaseBillingRepository}={}) {
  const router=express.Router();
  router.post('/run',adminGuard,async(req,res)=>{
    const taxMode=process.env.BILLING_TAX_MODE;
    const discountStacking=process.env.BILLING_DISCOUNT_STACKING;
    if(!['inclusive','exclusive'].includes(taxMode)||!['best','all'].includes(discountStacking)||process.env.BILLING_ROUNDING!=='half-up'){
      return res.status(503).json({success:false,data:null,message:'Billing policy has not been approved/configured',errors:null});
    }
    const target=req.body&&req.body.target_date ? req.body.target_date : new Date().toISOString().slice(0,10);
    if(typeof target!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(target)||
       Number.isNaN(Date.parse(target+'T00:00:00Z'))||new Date(target+'T00:00:00Z').toISOString().slice(0,10)!==target)
      return res.status(422).json({success:false,data:null,message:'target_date must be a real YYYY-MM-DD date',errors:null});
    try {
      const repository=repositoryFactory();
      const summary=await runDueBilling({repository,asOf:target,policy:{taxMode,discountStacking,rounding:'half-up'},batchSize:100});
      return res.status(summary.failed.length?207:200).json({
        success:summary.failed.length===0,data:summary,message:summary.failed.length?'Some billing periods failed; retry safely':'Billing batch processed',errors:null
      });
    } catch(_error) {
      return res.status(503).json({success:false,data:null,message:'Billing persistence unavailable or misconfigured',errors:null});
    }
  });
  return router;
}
module.exports={createBillingRouter};
