/**
 * LearnLens AI - Centralized API Service & Request Interceptor
 * Automatically injects JWT Bearer token into all /api requests
 * and handles 401 Unauthorized globally.
 */

const TOKEN_KEY = 'learnlens_token';
const USER_KEY = 'learnlens_user';

// Setup transparent fetch interceptor for all /api calls
const originalFetch = window.fetch.bind(window);

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input?.url || '');
  const isApi = url.startsWith('/api') || url.includes('/api/');

  if (isApi) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = new Headers(init.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    init = { ...init, headers };
  }

  const response = await originalFetch(input, init);

  if (isApi && response.status === 401) {
    // Don't trigger on login/signup failure (expected 401)
    if (!url.includes('/api/auth/login') && !url.includes('/api/auth/signup')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  return response;
};

export const api = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: () => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),

  // API Methods
  async get(endpoint) {
    const res = await window.fetch(endpoint);
    if (!res.ok) {
      let detail = `Error ${res.status}`;
      try {
        const err = await res.json();
        detail = err.detail || err.message || JSON.stringify(err);
      } catch {
        try {
          const text = await res.text();
          if (text) detail = text.slice(0, 200);
        } catch {}
      }
      throw new Error(detail);
    }
    return res.json();
  },

  async post(endpoint, data) {
    const res = await window.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let detail = `Error ${res.status}`;
      try {
        const err = await res.json();
        detail = err.detail || err.message || JSON.stringify(err);
      } catch {
        try {
          const text = await res.text();
          if (text) detail = text.slice(0, 200);
        } catch {}
      }
      throw new Error(detail);
    }
    return res.json();
  },

  async postFormData(endpoint, formData) {
    const res = await window.fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let detail = `Error ${res.status}`;
      try {
        const err = await res.json();
        detail = err.detail || err.message || JSON.stringify(err);
      } catch {
        try {
          const text = await res.text();
          if (text) detail = text.slice(0, 200);
        } catch {}
      }
      throw new Error(detail);
    }
    return res.json();
  },

  async delete(endpoint) {
    const res = await window.fetch(endpoint, {
      method: 'DELETE',
    });
    if (!res.ok) {
      let detail = `Error ${res.status}`;
      try {
        const err = await res.json();
        detail = err.detail || err.message || JSON.stringify(err);
      } catch {
        try {
          const text = await res.text();
          if (text) detail = text.slice(0, 200);
        } catch {}
      }
      throw new Error(detail);
    }
    return res.json();
  },
};

export default api;

