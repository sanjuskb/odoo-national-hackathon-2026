const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { env } = require('./config/env');
const { initMockDb } = require('./lib/mockDb');

if (env.USE_MOCK_DB) {
  console.log('------------------------------------------------------------');
  console.log(' [DATABASE] Running in local in-memory PostgreSQL/Supabase mock mode');
  console.log(' [DEMO ACCOUNTS PRE-SEEDED]');
  console.log('   - Admin:    admin@brightloop.local    / AdminPassword123!');
  console.log('   - Staff:    staff@brightloop.local    / StaffPassword123!');
  console.log('   - Customer: customer@brightloop.local / CustomerPassword123!');
  console.log('------------------------------------------------------------');
  initMockDb();
} else {
  console.log(`[DATABASE] Connected to Supabase: ${env.SUPABASE_URL}`);
}

const app = require('./app');

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Brightloop backend listening on port ${PORT}`);
  console.log(`API Base: http://localhost:${PORT}/api/v1`);
});
