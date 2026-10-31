function createSupabaseMock() {
  const users = new Map();
  const tokens = new Map();

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

  function reset() {
    users.clear();
    tokens.clear();
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
  };

  return {
    adminClient,
    publicClient,
    seedUser,
    reset,
    users,
    tokens,
  };
}

module.exports = {
  createSupabaseMock,
};
