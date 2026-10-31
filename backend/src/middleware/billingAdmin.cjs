'use strict';

// Billing routes are admin-only. Never rely on caller-supplied role/customer_id.
async function requireBillingAdmin(req,res,next){
  const match=/^Bearer ([^\s]+)$/.exec(req.get('Authorization')||'');
  if(!match)return res.status(401).json({success:false,data:null,message:'Authentication required',errors:null});
  const base=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const anon=process.env.SUPABASE_ANON_KEY;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!/^https:\/\/[^/]+\.supabase\.co$/.test(base)||!anon||!service)
    return res.status(503).json({success:false,data:null,message:'Authentication provider not configured',errors:null});
  try{
    const userResponse=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:'Bearer '+match[1]}});
    if(!userResponse.ok)return res.status(401).json({success:false,data:null,message:'Invalid login session',errors:null});
    const user=await userResponse.json();
    if(!user||typeof user.id!=='string'||!/^[0-9a-f-]{36}$/i.test(user.id))
      return res.status(401).json({success:false,data:null,message:'Invalid login session',errors:null});
    const profileResponse=await fetch(base+'/rest/v1/profiles?select=role&id=eq.'+user.id+'&limit=1',{
      headers:{apikey:service,Authorization:'Bearer '+service,Accept:'application/json'}});
    if(!profileResponse.ok)throw Error('Profile lookup failed');
    const rows=await profileResponse.json();
    if(!Array.isArray(rows)||!rows.length||rows[0].role!=='admin')
      return res.status(403).json({success:false,data:null,message:'Admin authorization required',errors:null});
    req.verifiedUserId=user.id;
    return next();
  }catch(_error){
    return res.status(503).json({success:false,data:null,message:'Authentication service temporarily unavailable',errors:null});
  }
}
module.exports={requireBillingAdmin};
