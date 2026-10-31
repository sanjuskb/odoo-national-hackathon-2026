#!/usr/bin/env node
// Focused tracked-file secret signature check. This supplements, not replaces,
// GitHub secret scanning, access reviews, and live credential rotation.
'use strict';
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const rules=[
  {name:'Supabase secret API key',pattern:/\bsb_secret_[A-Za-z0-9_-]{16,}\b/g},
  {name:'Stripe secret key',pattern:/\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/g},
  {name:'Razorpay account key',pattern:/\brzp_(?:live|test)_[A-Za-z0-9]{10,}\b/g},
  {name:'Private key PEM',pattern:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},
  {name:'JWT token',pattern:/\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g}
];
let failures=0,checked=0;
for(const file of files){
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.statSync(file).size>1024*1024)continue;
  if(/\.(png|jpe?g|webp|gif|ico|woff2?|pdf|zip|lockb)$/i.test(file))continue;
  const data=fs.readFileSync(file,'utf8');checked++;
  for(const r of rules){
    r.pattern.lastIndex=0;
    if(r.pattern.test(data)){
      failures++;
      // Do not print a matched credential or surrounding source.
      console.error('Potential '+r.name+' detected in tracked file '+file);
    }
  }
}
if(failures){console.error('FAIL: review and revoke any exposed real credentials; do not simply hide a live key.');process.exitCode=1;}
else console.log('Basic tracked-file secret signature scan passed for '+checked+' files (not a comprehensive secret audit).');
