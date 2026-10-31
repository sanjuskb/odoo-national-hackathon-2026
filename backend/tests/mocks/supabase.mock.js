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
  }

  function getTableMap(name) {
    if (name === 'products') return productsTable;
    if (name === 'product_variants') return variantsTable;
    if (name === 'plans') return plansTable;
    if (name === 'quotation_templates') return quotationTemplatesTable;
    if (name === 'quotation_template_lines' || name === 'template_lines') return quotationTemplateLinesTable;
    if (name === 'subscriptions') return subscriptionsTable;
    if (name === 'subscription_lines') return subscriptionLinesTable;
    return new Map();
  }

  function createQueryBuilder(tableName) {
    const table = getTableMap(tableName);
    let filters = [];
    let sortCol = null;
    let sortAsc = true;
    let rangeFrom = 0;
    let rangeTo = Infinity;
    let selectColumns = '*';
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

      if (sortCol) {
        results.sort((a, b) => {
          if (a[sortCol] < b[sortCol]) return sortAsc ? -1 : 1;
          if (a[sortCol] > b[sortCol]) return sortAsc ? 1 : -1;
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

      return { data: paged, error: null, count: totalCount };
    }

    const builder = {
      select: (cols = '*', _options) => {
        selectColumns = cols;
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
        sortCol = col;
        sortAsc = ascending;
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
  };
}

module.exports = {
  createSupabaseMock,
};
