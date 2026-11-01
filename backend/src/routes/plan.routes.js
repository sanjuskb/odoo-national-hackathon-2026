const express = require('express');
const router = express.Router();

const planController = require('../controllers/plan.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createPlanSchema,
  updatePlanSchema,
} = require('../validators/plan.validators');

// Public to authenticated: List & Retrieve (Customers restricted to available plans only)
router.get('/', authenticate, planController.listPlans);

router.get('/:id', authenticate, planController.getPlan);

// Admin-only writes
router.post('/', authenticate, requireRole('admin'), validate(createPlanSchema), planController.createPlan);

router.patch('/:id', authenticate, requireRole('admin'), validate(updatePlanSchema), planController.updatePlan);
router.put('/:id', authenticate, requireRole('admin'), validate(updatePlanSchema), planController.updatePlan);

module.exports = router;
