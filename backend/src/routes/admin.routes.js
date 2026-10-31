const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { staffSchema } = require('../validators/auth.validators');

// Alias /admin/staff to support both documented and proposed admin paths
router.post('/staff', authenticate, requireRole('admin'), validate(staffSchema), authController.createStaff);

module.exports = router;
