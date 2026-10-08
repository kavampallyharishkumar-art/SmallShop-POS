// Base API wrapper for Small Shop POS

const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('pos_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Server returned ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `Request failed (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  getMe: () => apiRequest('/auth/me'),
  getUsers: () => apiRequest('/auth/users'),
  registerUser: (userData) => apiRequest('/auth/register', { method: 'POST', body: userData }),
  updateUser: (id, userData) => apiRequest(`/auth/users/${id}`, { method: 'PATCH', body: userData }),

  // Categories
  getCategories: () => apiRequest('/categories'),
  createCategory: (data) => apiRequest('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => apiRequest(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return apiRequest(`/products?${qs.toString()}`);
  },
  getProduct: (id) => apiRequest(`/products/${id}`),
  createProduct: (data) => apiRequest('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => apiRequest(`/products/${id}`, { method: 'PUT', body: data }),
  adjustStock: (id, { delta, reason }) => apiRequest(`/products/${id}/stock`, { method: 'PATCH', body: { delta, reason } }),
  deleteProduct: (id) => apiRequest(`/products/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return apiRequest(`/customers?${qs.toString()}`);
  },
  getCustomer: (id) => apiRequest(`/customers/${id}`),
  createCustomer: (data) => apiRequest('/customers', { method: 'POST', body: data }),
  updateCustomer: (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: data }),
  deleteCustomer: (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return apiRequest(`/sales?${qs.toString()}`);
  },
  getSale: (id) => apiRequest(`/sales/${id}`),
  createSale: (saleData) => apiRequest('/sales', { method: 'POST', body: saleData }),
  voidSale: (id, reason) => apiRequest(`/sales/${id}/void`, { method: 'POST', body: { reason } }),

  // Reports
  getSummary: (from, to) => {
    const qs = new URLSearchParams();
    if (from) qs.append('from', from);
    if (to) qs.append('to', to);
    return apiRequest(`/reports/summary?${qs.toString()}`);
  },
};
