const AppError = require('../utils/AppError');
const { parseMoney, formatMoney, addMoney } = require('../utils/money');

/**
 * Computes unit price for a product and optional variant.
 * Invariant: The server is the sole authority on pricing.
 * Any client-supplied price is ignored.
 *
 * @param {object} product { id, sales_price, ... }
 * @param {object | null} variant { id, product_id, price_adjustment, ... }
 * @returns {{ product_id: string, variant_id: string | null, base_price: string, adjustment: string, unit_price: string }}
 */
function computeUnitPrice(product, variant = null) {
  if (!product || !product.sales_price) {
    throw new AppError('Valid product with sales_price is required', 400, 'INVALID_PRODUCT');
  }

  const baseMinor = parseMoney(product.sales_price);

  if (!variant) {
    return {
      product_id: product.id,
      variant_id: null,
      base_price: formatMoney(baseMinor),
      adjustment: '0.00',
      unit_price: formatMoney(baseMinor),
    };
  }

  // Security check: Variant MUST belong to this product
  if (variant.product_id && variant.product_id !== product.id) {
    throw new AppError('Variant does not belong to the specified product', 400, 'INVALID_VARIANT_ASSOCIATION');
  }

  const adjMinor = parseMoney(variant.price_adjustment || '0.00');
  const totalMinor = addMoney(baseMinor, adjMinor);

  return {
    product_id: product.id,
    variant_id: variant.id,
    base_price: formatMoney(baseMinor),
    adjustment: formatMoney(adjMinor),
    unit_price: formatMoney(totalMinor),
  };
}

module.exports = {
  computeUnitPrice,
};
