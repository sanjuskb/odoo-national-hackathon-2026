/**
 * Brightloop Billing & Invoice Generation Module.
 * 
 * Exports the deterministic invoice-generation service, billing-period
 * orchestrator, financial arithmetic utilities, and input validators.
 */

const {
  FinancialCalculationError,
  toCents,
  fromCents,
  multiplyQuantity,
  calculatePercentage,
} = require('./money');

const {
  VALID_FREQUENCIES,
  BillingPeriodError,
  isLeapYear,
  getDaysInMonth,
  parseDateParts,
  calculateBillingPeriod,
} = require('./billing-period');

const {
  DiscountRuleError,
  evaluateDiscountEligibility,
  calculateDiscountAmount,
} = require('./discounts');

const {
  TaxCalculationError,
  calculateTaxes,
} = require('./taxes');

const {
  InvoiceValidationError,
  validateInvoiceGenerationInput,
} = require('./validator');

const {
  InvoiceEngineError,
  generateInvoice,
} = require('./invoice-engine');

module.exports = {
  // Master Engine
  generateInvoice,
  InvoiceEngineError,

  // Billing Period Orchestration
  calculateBillingPeriod,
  VALID_FREQUENCIES,
  BillingPeriodError,
  isLeapYear,
  getDaysInMonth,
  parseDateParts,

  // Financial Precision
  toCents,
  fromCents,
  multiplyQuantity,
  calculatePercentage,
  FinancialCalculationError,

  // Discounts
  evaluateDiscountEligibility,
  calculateDiscountAmount,
  DiscountRuleError,

  // Taxes
  calculateTaxes,
  TaxCalculationError,

  // Validation
  validateInvoiceGenerationInput,
  InvoiceValidationError,
};

