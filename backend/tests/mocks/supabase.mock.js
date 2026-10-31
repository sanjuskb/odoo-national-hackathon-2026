function createSupabaseMock() {
  const users = new Map();
  const tokens = new Map();

  const productsTable = new Map();
  const variantsTable = new Map();
  const plansTable = new Map();

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

  function reset() {
    users.clear();
    tokens.clear();
    productsTable.clear();
    variantsTable.clear();
    plansTable.clear();
  }

  function getTableMap(name) {
    if (name === 'products') return productsTable;
    if (name === 'product_variants') return variantsTable;
    if (name === 'plans') return plansTable;
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

    async function execute() {
      if (insertPayload) {
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

      if (updatePayload) {
        if (results.length === 0) {
          return { data: [], error: { code: 'PGRST116', message: 'No rows found to update', status: 404 }, count: 0 };
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
        filters.push((row) => {
          table.delete(row.id);
          return false;
        });
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
    reset,
    users,
    tokens,
    productsTable,
    variantsTable,
    plansTable,
  };
}

module.exports = {
  createSupabaseMock,
};
