function createSupabaseMock() {
  const users = new Map();
  const tokens = new Map();

  const productsTable = new Map();
  const variantsTable = new Map();
  const plansTable = new Map();
  const quotationTemplatesTable = new Map();
  const quotationTemplateLinesTable = new Map();
  const subscriptionsTable = new Map();
  const subscriptionLinesTable = new Map();
  const taxRulesTable = new Map();
  const discountRulesTable = new Map();
  const discountProductMappingsTable = new Map();
  const invoicesTable = new Map();
  const invoiceLinesTable = new Map();
  const paymentsTable = new Map();

  function seedUser({ id, email, password = 'Password123!', full_name = 'Test User', role = 'customer', user_metadata = {} }) {
    const user = {
      id,
      email,
      password,
      user_metadata: { full_name, ...user_metadata },
      app_metadata: { role },
    };
    users.set(id, user);
    const token = `token-${id}`;
    tokens.set(token, id);
    return { user, token };
  }

  function seedProduct(p) {
    const id = p.id || `prod-${Math.random().toString(36).substring(2, 9)}`;
    const product = {
      id,
      name: p.name,
      type: p.type || 'service',
      sales_price: p.sales_price || 0,
      cost_price: p.cost_price || 0,
      notes: p.notes || null,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString(),
    };
    productsTable.set(id, product);
    return product;
  }

  function seedVariant(v) {
    const id = v.id || `var-${Math.random().toString(36).substring(2, 9)}`;
    const variant = {
      id,
      product_id: v.product_id,
      name: v.name,
      price_adjustment: v.price_adjustment || 0,
      created_at: v.created_at || new Date().toISOString(),
      updated_at: v.updated_at || new Date().toISOString(),
    };
    variantsTable.set(id, variant);
    return variant;
  }

  function seedPlan(pl) {
    const id = pl.id || `plan-${Math.random().toString(36).substring(2, 9)}`;
    const plan = {
      id,
      product_id: pl.product_id,
      price: pl.price || 0,
      frequency: pl.frequency || 'monthly',
      min_quantity: pl.min_quantity ?? 1,
      available_from: pl.available_from || null,
      available_until: pl.available_until || null,
      auto_close: Boolean(pl.auto_close),
      allow_early_close: Boolean(pl.allow_early_close),
      allow_pause: Boolean(pl.allow_pause),
      allow_renew: Boolean(pl.allow_renew),
      created_at: pl.created_at || new Date().toISOString(),
      updated_at: pl.updated_at || new Date().toISOString(),
    };
    plansTable.set(id, plan);
    return plan;
  }

  function seedQuotationTemplate(t) {
    const id = t.id || `tmpl-${Math.random().toString(36).substring(2, 9)}`;
    const template = {
      id,
      name: t.name,
      plan_id: t.plan_id,
      validity_days: t.validity_days || 30,
      created_at: t.created_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString(),
    };
    quotationTemplatesTable.set(id, template);
    return template;
  }

  function seedSubscription(s) {
    const id = s.id || `sub-${Math.random().toString(36).substring(2, 9)}`;
    const sub = {
      id,
      subscription_number: s.subscription_number,
      customer_id: s.customer_id,
      plan_id: s.plan_id,
      start_date: s.start_date,
      expiry_date: s.expiry_date,
      payment_terms: s.payment_terms || 'immediate',
      status: s.status || 'draft',
      valid_until: s.valid_until || null,
      template_id: s.template_id || null,
      next_billing_date: s.next_billing_date || null,
      billing_anchor_date: s.billing_anchor_date || null,
      is_paused: Boolean(s.is_paused),
      created_at: s.created_at || new Date().toISOString(),
      updated_at: s.updated_at || new Date().toISOString(),
    };
    subscriptionsTable.set(id, sub);
    return sub;
  }

  function seedSubscriptionLine(l) {
    const id = l.id || `line-${Math.random().toString(36).substring(2, 9)}`;
    const line = {
      id,
      subscription_id: l.subscription_id,
      product_id: l.product_id,
      variant_id: l.variant_id || null,
      quantity: l.quantity || 1,
      unit_price: l.unit_price || '0.00',
      tax_id: l.tax_id || null,
      amount: l.amount || '0.00',
      description: l.description || null,
      variant_adjustment: l.variant_adjustment || null,
      tax_rate_percent: l.tax_rate_percent || null,
      created_at: l.created_at || new Date().toISOString(),
      updated_at: l.updated_at || new Date().toISOString(),
    };
    subscriptionLinesTable.set(id, line);
    return line;
  }

  function seedTaxRule(t) {
    const id = t.id || `tax-${Math.random().toString(36).substring(2, 9)}`;
    const tax = {
      id,
      name: t.name,
      rate_percent: t.rate_percent || t.rate || '0.00',
      rate: t.rate || t.rate_percent || '0.00',
      description: t.description || null,
      is_active: t.is_active !== undefined ? Boolean(t.is_active) : true,
      created_at: t.created_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString(),
    };
    taxRulesTable.set(id, tax);
    return tax;
  }

  function seedDiscountRule(d) {
    const id = d.id || `disc-${Math.random().toString(36).substring(2, 9)}`;
    const rule = {
      id,
      name: d.name || 'Discount',
      kind: d.kind || d.type || 'percentage',
      type: d.type || d.kind || 'percentage',
      value: d.value || '0.00',
      scope: d.scope || 'subscription',
      min_amount: d.min_amount !== undefined ? d.min_amount : null,
      min_quantity: d.min_quantity !== undefined ? d.min_quantity : null,
      valid_from: d.valid_from || d.start_date || null,
      start_date: d.start_date || d.valid_from || null,
      valid_until: d.valid_until || d.end_date || null,
      end_date: d.end_date || d.valid_until || null,
      max_uses: d.max_uses !== undefined ? d.max_uses : null,
      used_count: d.used_count || 0,
      is_active: d.is_active !== undefined ? Boolean(d.is_active) : true,
      created_at: d.created_at || new Date().toISOString(),
      updated_at: d.updated_at || new Date().toISOString(),
    };
    discountRulesTable.set(id, rule);
    return rule;
  }

  function seedDiscountProductMapping(m) {
    const id = m.id || `dpm-${Math.random().toString(36).substring(2, 9)}`;
    const mapping = {
      id,
      discount_rule_id: m.discount_rule_id,
      product_id: m.product_id,
      created_at: m.created_at || new Date().toISOString(),
      updated_at: m.updated_at || new Date().toISOString(),
    };
    discountProductMappingsTable.set(id, mapping);
    return mapping;
  }

  function seedInvoice(inv) {
    const id = inv.id || `inv-${Math.random().toString(36).substring(2, 9)}`;
    const endPeriod = inv.billing_period_end_exclusive || inv.billing_period_end || null;
    const invoice = {
      id,
      subscription_id: inv.subscription_id || null,
      customer_id: inv.customer_id,
      billing_period_start: inv.billing_period_start || null,
      billing_period_end: endPeriod,
      billing_period_end_exclusive: endPeriod,
      currency: inv.currency || 'INR',
      invoice_number: inv.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
      subtotal: inv.subtotal || '0.00',
      discount_total: inv.discount_total || '0.00',
      tax_total: inv.tax_total || '0.00',
      total: inv.total || '0.00',
      status: inv.status || 'draft',
      due_date: inv.due_date || null,
      paid_at: inv.paid_at || null,
      sent_at: inv.sent_at || null,
      created_at: inv.created_at || new Date().toISOString(),
      updated_at: inv.updated_at || new Date().toISOString(),
    };
    invoicesTable.set(id, invoice);
    return invoice;
  }

  function seedInvoiceLine(l) {
    const id = l.id || `invline-${Math.random().toString(36).substring(2, 9)}`;
    const taxPct = l.tax_percent || l.tax_rate_percent || '0.00';
    const line = {
      id,
      invoice_id: l.invoice_id,
      product_id: l.product_id,
      description: l.description || 'Invoice Line',
      quantity: l.quantity || 1,
      unit_price: l.unit_price || '0.00',
      variant_adjustment: l.variant_adjustment || '0.00',
      tax_percent: taxPct,
      tax_rate_percent: taxPct,
      base_amount: l.base_amount || '0.00',
      discount_amount: l.discount_amount || '0.00',
      tax_amount: l.tax_amount || '0.00',
      line_total: l.line_total || '0.00',
      created_at: l.created_at || new Date().toISOString(),
      updated_at: l.updated_at || new Date().toISOString(),
    };
    invoiceLinesTable.set(id, line);
    return line;
  }

  function seedPayment(p) {
    const id = p.id || `pmt-${Math.random().toString(36).substring(2, 9)}`;
    const pDate = p.paid_at || p.payment_date || new Date().toISOString().slice(0, 10);
    const ref = p.external_reference || p.reference || null;
    const payment = {
      id,
      invoice_id: p.invoice_id,
      amount: p.amount || '0.00',
      payment_date: pDate,
      paid_at: pDate,
      method: p.method || 'cash',
      reference: ref,
      external_reference: ref,
      note: p.note || null,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString(),
    };
    paymentsTable.set(id, payment);
    return payment;
  }

  function reset() {
    users.clear();
    tokens.clear();
    productsTable.clear();
    variantsTable.clear();
    plansTable.clear();
    quotationTemplatesTable.clear();
    quotationTemplateLinesTable.clear();
    subscriptionsTable.clear();
    subscriptionLinesTable.clear();
    taxRulesTable.clear();
    discountRulesTable.clear();
    discountProductMappingsTable.clear();
    invoicesTable.clear();
    invoiceLinesTable.clear();
    paymentsTable.clear();
  }

  function getTableMap(name) {
    if (name === 'products') return productsTable;
    if (name === 'product_variants') return variantsTable;
    if (name === 'plans') return plansTable;
    if (name === 'quotation_templates') return quotationTemplatesTable;
    if (name === 'quotation_template_lines' || name === 'template_lines') return quotationTemplateLinesTable;
    if (name === 'subscriptions') return subscriptionsTable;
    if (name === 'subscription_lines') return subscriptionLinesTable;
    if (name === 'tax_rules' || name === 'taxes') return taxRulesTable;
    if (name === 'discount_rules' || name === 'discounts') return discountRulesTable;
    if (name === 'discount_product_mappings') return discountProductMappingsTable;
    if (name === 'invoices') return invoicesTable;
    if (name === 'invoice_lines') return invoiceLinesTable;
    if (name === 'payments') return paymentsTable;
    return new Map();
  }

  function createQueryBuilder(tableName) {
    const table = getTableMap(tableName);
    let filters = [];
    let orders = [];
    let rangeFrom = 0;
    let rangeTo = Infinity;
    let selectColumns = '*';
    let selectOptions = {};
    let updatePayload = null;
    let insertPayload = null;
    let isDelete = false;

    async function execute() {
      // Handle insert
      if (insertPayload) {
        if (Array.isArray(insertPayload)) {
          const rows = [];
          for (const item of insertPayload) {
            const id = item.id || `id-${Math.random().toString(36).substring(2, 9)}`;
            const row = {
              ...item,
              id,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || new Date().toISOString(),
            };
            table.set(id, row);
            rows.push(row);
          }
          return { data: rows, error: null, count: rows.length };
        }

        // Single insert: check unique constraints
        if (tableName === 'subscriptions' && insertPayload.subscription_number) {
          for (const existing of subscriptionsTable.values()) {
            if (existing.subscription_number === insertPayload.subscription_number) {
              return {
                data: null,
                error: { code: '23505', message: 'duplicate key value violates unique constraint' },
                count: 0,
              };
            }
          }
        }

        const id = insertPayload.id || `id-${Math.random().toString(36).substring(2, 9)}`;
        const row = {
          ...insertPayload,
          id,
          created_at: insertPayload.created_at || new Date().toISOString(),
          updated_at: insertPayload.updated_at || new Date().toISOString(),
        };
        table.set(id, row);
        return { data: [row], error: null, count: 1 };
      }

      let results = Array.from(table.values()).map((r) => ({ ...r }));

      for (const f of filters) {
        results = results.filter(f);
      }

      // Handle delete
      if (isDelete) {
        for (const r of results) {
          table.delete(r.id);
        }
        return { data: results, error: null, count: results.length };
      }

      // Handle update
      if (updatePayload) {
        if (results.length === 0) {
          return { data: [], error: null, count: 0 };
        }
        for (const r of results) {
          const updated = {
            ...r,
            ...updatePayload,
            updated_at: updatePayload.updated_at || new Date().toISOString(),
          };
          table.set(r.id, updated);
        }
        results = results.map((r) => table.get(r.id));
        return { data: results, error: null, count: results.length };
      }

      if (orders.length > 0) {
        results.sort((a, b) => {
          for (const { col, ascending } of orders) {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
          }
          return 0;
        });
      }

      const totalCount = results.length;
      const paged = results.slice(rangeFrom, rangeTo + 1);

      // Populate joins if requested
      if (tableName === 'products' && selectColumns.includes('product_variants')) {
        for (const p of paged) {
          p.product_variants = Array.from(variantsTable.values())
            .filter((v) => v.product_id === p.id)
            .map((v) => ({ ...v }));
        }
      }

      if (selectOptions && selectOptions.head) {
        return { data: null, error: null, count: totalCount };
      }

      return { data: paged, error: null, count: totalCount };
    }

    const builder = {
      select: (cols = '*', options = {}) => {
        selectColumns = cols;
        selectOptions = options || {};
        return builder;
      },
      insert: (payload) => {
        insertPayload = payload;
        return builder;
      },
      update: (payload) => {
        updatePayload = payload;
        return builder;
      },
      delete: () => {
        isDelete = true;
        return builder;
      },
      eq: (col, val) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      neq: (col, val) => {
        filters.push((row) => row[col] !== val);
        return builder;
      },
      lt: (col, val) => {
        filters.push((row) => (row[col] ? row[col] < val : false));
        return builder;
      },
      lte: (col, val) => {
        filters.push((row) => (row[col] ? row[col] <= val : false));
        return builder;
      },
      gt: (col, val) => {
        filters.push((row) => (row[col] ? row[col] > val : false));
        return builder;
      },
      gte: (col, val) => {
        filters.push((row) => (row[col] ? row[col] >= val : false));
        return builder;
      },
      in: (col, arr) => {
        filters.push((row) => Array.isArray(arr) && arr.includes(row[col]));
        return builder;
      },
      is: (col, val) => {
        filters.push((row) => (val === null ? row[col] === null || row[col] === undefined : row[col] === val));
        return builder;
      },
      ilike: (col, pattern) => {
        const clean = pattern.replace(/%/g, '').toLowerCase();
        filters.push((row) => (row[col] ? String(row[col]).toLowerCase().includes(clean) : false));
        return builder;
      },
      or: (filterStr) => {
        const clauses = filterStr.split(',');
        filters.push((row) => {
          return clauses.some((clause) => {
            const parts = clause.split('.');
            const col = parts[0];
            const op = parts[1];
            const val = parts.slice(2).join('.');
            if (op === 'is' && val === 'null') {
              return row[col] === null || row[col] === undefined;
            }
            if (op === 'lte') {
              return row[col] ? new Date(row[col]) <= new Date(val) : false;
            }
            if (op === 'gte') {
              return row[col] ? new Date(row[col]) >= new Date(val) : false;
            }
            return false;
          });
        });
        return builder;
      },
      order: (col, { ascending = true } = {}) => {
        orders.push({ col, ascending });
        return builder;
      },
      range: (from, to) => {
        rangeFrom = from;
        rangeTo = to;
        return builder;
      },
      limit: (lim) => {
        rangeFrom = 0;
        rangeTo = lim - 1;
        return builder;
      },
      single: async () => {
        const res = await execute();
        if (res.error) return res;
        if (!res.data || res.data.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'No rows found', status: 404 } };
        }
        return { data: res.data[0], error: null };
      },
      maybeSingle: async () => {
        const res = await execute();
        if (res.error) return res;
        return { data: (res.data && res.data[0]) || null, error: null };
      },
      then: (resolve, reject) => {
        execute().then(resolve, reject);
      },
    };

    return builder;
  }

  const adminClient = {
    auth: {
      getUser: async (token) => {
        const userId = tokens.get(token);
        if (!userId || !users.has(userId)) {
          return { data: { user: null }, error: { message: 'Invalid or expired token', status: 401 } };
        }
        return { data: { user: users.get(userId) }, error: null };
      },
      admin: {
        createUser: async ({ email, password, user_metadata = {} }) => {
          for (const u of users.values()) {
            if (u.email.toLowerCase() === email.toLowerCase()) {
              return { data: null, error: { message: 'User already registered', status: 422 } };
            }
          }
          const id = `user-${Math.random().toString(36).substring(2, 9)}`;
          const user = {
            id,
            email,
            password,
            user_metadata,
            app_metadata: {},
          };
          users.set(id, user);
          return { data: { user }, error: null };
        },
        getUserById: async (id) => {
          const user = users.get(id);
          if (!user) {
            return { data: { user: null }, error: { message: 'User not found', status: 404 } };
          }
          return { data: { user }, error: null };
        },
        updateUserById: async (id, { app_metadata, user_metadata }) => {
          const user = users.get(id);
          if (!user) {
            return { data: { user: null }, error: { message: 'User not found', status: 404 } };
          }
          if (app_metadata) {
            user.app_metadata = { ...user.app_metadata, ...app_metadata };
          }
          if (user_metadata) {
            user.user_metadata = { ...user.user_metadata, ...user_metadata };
          }
          users.set(id, user);
          return { data: { user }, error: null };
        },
      },
    },
    from: (tableName) => createQueryBuilder(tableName),
  };

  const publicClient = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        for (const u of users.values()) {
          if (u.email.toLowerCase() === email.toLowerCase()) {
            if (u.password === password) {
              const token = `token-${u.id}`;
              tokens.set(token, u.id);
              return {
                data: {
                  session: {
                    access_token: token,
                    refresh_token: `refresh-${u.id}`,
                    expires_at: Math.floor(Date.now() / 1000) + 3600,
                  },
                  user: u,
                },
                error: null,
              };
            }
            return {
              data: { session: null, user: null },
              error: { message: 'Invalid login credentials', status: 400 },
            };
          }
        }
        return {
          data: { session: null, user: null },
          error: { message: 'Invalid login credentials', status: 400 },
        };
      },
      resetPasswordForEmail: async (_email, _options) => {
        return { data: {}, error: null };
      },
    },
    from: (tableName) => createQueryBuilder(tableName),
  };

  return {
    adminClient,
    publicClient,
    seedUser,
    seedProduct,
    seedVariant,
    seedPlan,
    seedQuotationTemplate,
    seedSubscription,
    seedSubscriptionLine,
    seedTaxRule,
    seedDiscountRule,
    seedDiscountProductMapping,
    seedInvoice,
    seedInvoiceLine,
    seedPayment,
    reset,
    users,
    tokens,
    productsTable,
    variantsTable,
    plansTable,
    quotationTemplatesTable,
    quotationTemplateLinesTable,
    subscriptionsTable,
    subscriptionLinesTable,
    taxRulesTable,
    discountRulesTable,
    discountProductMappingsTable,
    invoicesTable,
    invoiceLinesTable,
    paymentsTable,
  };
}

module.exports = {
  createSupabaseMock,
};
