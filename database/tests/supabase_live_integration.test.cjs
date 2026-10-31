'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('Live Supabase integration connectivity & persistence readiness', async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes('your-') || url.includes('test.supabase.co')) {
    assert.fail(
      '[LIVE PERSISTENCE BLOCKED] Real Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are absent or set to placeholders in environment. ' +
      'Live database persistence cannot be claimed or executed until authentic project credentials are provided.'
    );
  }

  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.from('subscriptions').select('id').limit(1);
  assert.equal(error, null, `Live Supabase query failed: ${error ? error.message : ''}`);
});
