const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { staffSchema } = require('../validators/auth.validators');
const { getSupabaseAdmin } = require('../lib/supabase');
const { sendSuccess } = require('../utils/response');

// Alias /admin/staff to support both documented and proposed admin paths
router.post('/staff', authenticate, requireRole('admin'), validate(staffSchema), authController.createStaff);

// List all profiles / customers for admin and staff
router.get('/customers', authenticate, requireRole(['admin', 'staff']), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, company_name, phone, account_status, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return sendSuccess(res, { customers: data || [] }, 'Customers retrieved successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
