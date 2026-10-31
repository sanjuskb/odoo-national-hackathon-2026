const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const staffRoutes = require('./staff.routes');
const adminRoutes = require('./admin.routes');
const productRoutes = require('./product.routes');
const planRoutes = require('./plan.routes');
const quotationTemplateRoutes = require('./quotationTemplate.routes');
const subscriptionRoutes = require('./subscription.routes');
const portalRoutes = require('./portal.routes');
const taxRoutes = require('./tax.routes');
const discountRoutes = require('./discount.routes');
const billingPreviewRoutes = require('./billingPreview.routes');

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);
router.use('/products', productRoutes);
router.use('/plans', planRoutes);
router.use('/quotation-templates', quotationTemplateRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/portal', portalRoutes);
router.use('/taxes', taxRoutes);
router.use('/discounts', discountRoutes);
router.use('/billing', billingPreviewRoutes);

// Protected admin billing trigger — calls Sanju's deterministic invoice module
const { createBillingRouter } = require('./billing.cjs');
router.use('/billing', createBillingRouter());

// Test harness route for testing requireSelfOrStaff in test mode
if (process.env.NODE_ENV === 'test') {
  const authenticate = require('../middleware/authenticate');
  const requireSelfOrStaff = require('../middleware/requireSelfOrStaff');
  router.get('/test/users/:userId', authenticate, requireSelfOrStaff('userId'), (req, res) => {
    res.status(200).json({
      success: true,
      data: { accessed: req.params.userId, user: req.user },
      message: 'Authorized',
      errors: null,
    });
  });
}

module.exports = router;
