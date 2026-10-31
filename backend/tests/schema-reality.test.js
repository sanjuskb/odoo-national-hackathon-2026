'use strict';

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 7b: Evidence-Based Schema Reconciliation & Drift Test', () => {
  const schemaPath = path.resolve(__dirname, '../../database/schema/01_brightloop_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const EXPECTED_TABLES = [
    'profiles',
    'products',
    'product_variants',
    'plans',
    'tax_rules',
    'quotation_templates',
    'quotation_template_lines',
    'subscriptions',
    'subscription_lines',
    'discount_rules',
    'discount_product_mappings',
    'invoices',
    'invoice_lines',
    'discount_redemptions',
    'payments',
    'ai_assistance_events',
  ];

  it('contains all 16 canonical tables defined in 01_brightloop_schema.sql', () => {
    for (const tableName of EXPECTED_TABLES) {
      const pattern = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${tableName}\\b`, 'i');
      expect(schemaSql).toMatch(pattern);
    }
  });

  it('validates critical table constraints and exact column names in database DDL', () => {
    // 1. plans table has frequency (NOT billing_frequency)
    expect(schemaSql).toMatch(/frequency TEXT NOT NULL CHECK \(frequency IN \('daily', 'weekly', 'monthly', 'yearly'\)\)/);

    // 2. plans table has price and currency
    expect(schemaSql).toMatch(/currency CHAR\(3\) NOT NULL/);

    // 3. subscriptions status includes all 6 lifecycle states
    expect(schemaSql).toMatch(/CHECK \(status IN \('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'\)\)/);

    // 4. invoices table uses billing_period_end_exclusive
    expect(schemaSql).toMatch(/billing_period_end_exclusive DATE NOT NULL/);

    // 5. invoice_lines table uses tax_percent (NOT tax_rate_percent)
    expect(schemaSql).toMatch(/tax_percent NUMERIC\(5, 2\) NOT NULL CHECK \(tax_percent BETWEEN 0 AND 100\)/);

    // 6. payments table uses paid_at and external_reference
    expect(schemaSql).toMatch(/paid_at TIMESTAMPTZ NOT NULL/);
    expect(schemaSql).toMatch(/external_reference TEXT/);
  });

  it('verifies that SCHEMA_REALITY.md and SCHEMA_GAPS.sql exist and are populated', () => {
    const realityPath = path.resolve(__dirname, '../SCHEMA_REALITY.md');
    const gapsPath = path.resolve(__dirname, '../SCHEMA_GAPS.sql');
    const draftPath = path.resolve(__dirname, '../SCHEMA_DRAFT.sql');

    expect(fs.existsSync(realityPath)).toBe(true);
    expect(fs.existsSync(gapsPath)).toBe(true);

    const realityContent = fs.readFileSync(realityPath, 'utf8');
    const gapsContent = fs.readFileSync(gapsPath, 'utf8');
    const draftContent = fs.readFileSync(draftPath, 'utf8');

    expect(realityContent).toContain('Brightloop Schema Reality & Reconciliation Report');
    expect(realityContent).toContain('persist_due_billing_invoice');
    expect(gapsContent).toContain('PROPOSED ALTERs - NOT APPLIED - for Harsha\'s review');
    expect(draftContent).toContain('SUPERSEDED by Harsha\'s migrations (see SCHEMA_REALITY.md). Do not use.');
  });

  it('validates repository mapping layer for renamed columns', () => {
    const plansRepo = require('../src/repositories/plans.repository');
    const dbRow = {
      id: 'plan-123',
      product_id: 'prod-456',
      name: 'Pro Plan',
      price: '99.00',
      currency: 'INR',
      frequency: 'monthly',
      min_quantity: 1,
      available_from: null,
      available_until: null,
      auto_close: false,
      allow_early_close: false,
      allow_pause: true,
      allow_renew: true,
      created_at: '2026-10-31T00:00:00Z',
      updated_at: '2026-10-31T00:00:00Z',
    };

    const mapped = plansRepo.mapPlanFromDb(dbRow);
    expect(mapped.frequency).toBe('monthly');
    expect(mapped.billing_frequency).toBe('monthly');
    expect(mapped.currency).toBe('INR');
    expect(mapped.name).toBe('Pro Plan');
  });

  it('validates payment repository mapping layer for paid_at and external_reference', () => {
    const paymentsRepo = require('../src/repositories/payments.repository');
    const dbRow = {
      id: 'pmt-1',
      invoice_id: 'inv-1',
      amount: '500.00',
      method: 'bank_transfer',
      paid_at: '2026-10-31T12:00:00.000Z',
      note: 'Payment received',
      external_reference: 'TXN-999',
      created_at: '2026-10-31T12:00:00.000Z',
    };

    const mapped = paymentsRepo.mapPaymentFromDb(dbRow);
    expect(mapped.paid_at).toBe('2026-10-31T12:00:00.000Z');
    expect(mapped.payment_date).toBe('2026-10-31T12:00:00.000Z');
    expect(mapped.external_reference).toBe('TXN-999');
    expect(mapped.reference).toBe('TXN-999');
  });
});
