const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { staffSchema } = require('../validators/auth.validators');

// Documented path in docs/integration/api-contracts.md: POST /api/v1/staff (Admin only)
router.post('/', authenticate, requireRole('admin'), validate(staffSchema), authController.createStaff);

module.exports = router;
