const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
} = require('../validators/product.validators');

// Public to authenticated: List & Retrieve
router.get('/', authenticate, productController.listProducts);

// Addition to contract: compute unit price for product + optional variant
router.get('/:id/price', authenticate, productController.getPrice);

router.get('/:id', authenticate, productController.getProduct);

// Admin-only writes
router.post('/', authenticate, requireRole('admin'), validate(createProductSchema), productController.createProduct);

router.patch('/:id', authenticate, requireRole('admin'), validate(updateProductSchema), productController.updateProduct);
router.put('/:id', authenticate, requireRole('admin'), validate(updateProductSchema), productController.updateProduct);

// Variants
router.post('/:id/variants', authenticate, requireRole('admin'), validate(createVariantSchema), productController.createVariant);

router.patch('/:id/variants/:variantId', authenticate, requireRole('admin'), validate(updateVariantSchema), productController.updateVariant);
router.put('/:id/variants/:variantId', authenticate, requireRole('admin'), validate(updateVariantSchema), productController.updateVariant);

module.exports = router;
