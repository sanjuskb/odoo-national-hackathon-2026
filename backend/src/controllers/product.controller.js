const productsRepository = require('../repositories/products.repository');
const variantsRepository = require('../repositories/variants.repository');
const pricingService = require('../services/pricing.service');
const { successResponse } = require('../utils/response');
const AppError = require('../utils/AppError');

function sanitizeProductForRole(product, role) {
  if (!product) return null;
  const clone = { ...product };
  // Cost price is hidden from customers
  if (role === 'customer') {
    delete clone.cost_price;
  }
  return clone;
}

async function listProducts(req, res, next) {
  try {
    const { page, page_size, search, type } = req.query;
    const result = await productsRepository.list({ page, page_size, search, type });

    const role = req.user?.role || 'customer';
    result.items = result.items.map((p) => sanitizeProductForRole(p, role));

    return successResponse(res, 200, result, 'Products retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await productsRepository.getById(req.params.id);
    const role = req.user?.role || 'customer';
    const sanitized = sanitizeProductForRole(product, role);

    return successResponse(res, 200, { product: sanitized, variants: sanitized.variants || [] }, 'Product retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const created = await productsRepository.create(req.body);
    return successResponse(res, 201, { product: created }, 'Product created successfully');
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const updated = await productsRepository.update(req.params.id, req.body);
    return successResponse(res, 200, { product: updated }, 'Product updated successfully');
  } catch (err) {
    next(err);
  }
}

async function createVariant(req, res, next) {
  try {
    const productId = req.params.id;
    // Verify parent product exists
    await productsRepository.getById(productId);

    const created = await variantsRepository.create({
      ...req.body,
      product_id: productId,
    });

    return successResponse(res, 201, { variant: created }, 'Product variant created successfully');
  } catch (err) {
    next(err);
  }
}

async function updateVariant(req, res, next) {
  try {
    const { id: productId, variantId } = req.params;

    // Verify parent product exists
    await productsRepository.getById(productId);

    const existingVariant = await variantsRepository.getById(variantId);
    if (!existingVariant || existingVariant.product_id !== productId) {
      throw new AppError('Variant not found for the specified product', 404, 'NOT_FOUND');
    }

    const updated = await variantsRepository.update(variantId, req.body);
    return successResponse(res, 200, { variant: updated }, 'Product variant updated successfully');
  } catch (err) {
    next(err);
  }
}

async function getPrice(req, res, next) {
  try {
    const productId = req.params.id;
    const variantId = req.query.variant_id;

    const product = await productsRepository.getById(productId);
    let variant = null;

    if (variantId) {
      variant = await variantsRepository.getById(variantId);
      if (!variant || variant.product_id !== productId) {
        throw new AppError('Variant not found for the specified product', 404, 'NOT_FOUND');
      }
    }

    const priceDetails = pricingService.computeUnitPrice(product, variant);
    return successResponse(res, 200, priceDetails, 'Price calculated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  createVariant,
  updateVariant,
  getPrice,
};
