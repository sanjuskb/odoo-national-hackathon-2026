import {describe,it,expect} from 'vitest';
import request from 'supertest';
import express from 'express';
import app from '../src/app.js';
import billing from '../src/routes/billing.cjs';

describe('Billing admin route integration',()=>{
  it('rejects unauthenticated billing requests before running any calculations',async()=>{
    const res=await request(app).post('/api/v1/billing/run').send({target_date:'2026-10-31'});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
  it('reports missing approved billing policy without writing any invoice',async()=>{
    const local=express();local.use(express.json());
    let created=0;
    local.use('/billing',billing.createBillingRouter({
      adminGuard:(_req,_res,next)=>next(),
      repositoryFactory:()=>{created++;return {};}
    }));
    const vars=['BILLING_TAX_MODE','BILLING_DISCOUNT_STACKING','BILLING_ROUNDING'];
    const previous=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
    delete process.env.BILLING_TAX_MODE;
    delete process.env.BILLING_DISCOUNT_STACKING;
    delete process.env.BILLING_ROUNDING;
    try{
      const res=await request(local).post('/billing/run').send({});
      expect(res.status).toBe(503);
      expect(created).toBe(0);
    }finally{
      for(const k of vars) previous[k]===undefined?delete process.env[k]:process.env[k]=previous[k];
    }
  });
});
