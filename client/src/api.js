// Client API service with JWT authentication handling & ngrok bypass

const BASE_URL = '/api';

const memoryStorage = {};
const safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = value;
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memoryStorage[key];
    }
  }
};

function getAuthHeader() {
  const token = safeStorage.getItem('res_stock_token');
  const headers = {
    'ngrok-skip-browser-warning': 'true'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  safeStorage,

  // Authentication
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    safeStorage.setItem('res_stock_token', data.token);
    safeStorage.setItem('res_stock_user', JSON.stringify(data.user));
    return data;
  },

  async register(userData) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register account');
    return data;
  },

  async clearDemoData(department = 'All', password) {
    const res = await fetch(`${BASE_URL}/system/clear-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ department, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clear data');
    return data;
  },

  async seedDemoData() {
    const res = await fetch(`${BASE_URL}/system/seed-demo`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to restore demo data');
    return data;
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Session invalid');
    return res.json();
  },

  async getDemoUsers() {
    try {
      const res = await fetch(`${BASE_URL}/auth/demo-users`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error('Failed to fetch demo users');
      return await res.json();
    } catch (e) {
      console.warn('Using local fallback demo users:', e);
      return [
        { username: 'admin', name: 'Alex Vance (General Manager)', role: 'Admin', department: 'All', password: 'admin123' },
        { username: 'chef_marco', name: 'Marco Rossi (Executive Chef)', role: 'Kitchen Manager', department: 'Kitchen', password: 'kitchen123' },
        { username: 'bar_sarah', name: 'Sarah Jenkins (Head Mixologist)', role: 'Bar Manager', department: 'Bar', password: 'bar123' },
        { username: 'hk_elena', name: 'Elena Rostova (Operations Lead)', role: 'Housekeeping Lead', department: 'Housekeeping', password: 'housekeeping123' }
      ];
    }
  },

  logout() {
    safeStorage.removeItem('res_stock_token');
    safeStorage.removeItem('res_stock_user');
  },

  getCurrentUser() {
    const userStr = safeStorage.getItem('res_stock_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // Dashboard stats
  async getDashboardStats(department = 'All') {
    const query = department && department !== 'All' ? `?department=${encodeURIComponent(department)}` : '';
    const res = await fetch(`${BASE_URL}/dashboard/stats${query}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Inventory Items
  async getItems(params = {}) {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const res = await fetch(`${BASE_URL}/items?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
  },

  async getItem(id) {
    const res = await fetch(`${BASE_URL}/items/${id}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch item details');
    return res.json();
  },

  async createItem(itemData) {
    const res = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(itemData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create item');
    return data;
  },

  async updateItem(id, itemData) {
    const res = await fetch(`${BASE_URL}/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(itemData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update item');
    return data;
  },

  async deleteItem(id) {
    const res = await fetch(`${BASE_URL}/items/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete item');
    return data;
  },

  async bulkUpdateItems(item_ids, updates, stock_adjustment) {
    const res = await fetch(`${BASE_URL}/items/bulk`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ item_ids, updates, stock_adjustment })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to perform bulk update');
    return data;
  },

  async bulkDeleteItems(item_ids) {
    const res = await fetch(`${BASE_URL}/items/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ item_ids })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to perform bulk delete');
    return data;
  },

  // Stock In / Stock Out transactions
  async stockIn({ item_id, quantity, destination_or_source, notes }) {
    const res = await fetch(`${BASE_URL}/transactions/stock-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ item_id, quantity, destination_or_source, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Stock In failed');
    return data;
  },

  async stockOut({ item_id, quantity, destination_or_source, notes, allow_negative }) {
    const res = await fetch(`${BASE_URL}/transactions/stock-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ item_id, quantity, destination_or_source, notes, allow_negative })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Stock Out failed');
    return data;
  },

  async quickAdjust(item_id, delta, reason) {
    const res = await fetch(`${BASE_URL}/transactions/quick-adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ item_id, delta, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Quick adjust failed');
    return data;
  },

  async getTransactions(params = {}) {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.item_id) query.append('item_id', params.item_id);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${BASE_URL}/transactions?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  // Excel operations
  async uploadExcel(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = safeStorage.getItem('res_stock_token');
    const headers = { 'ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/excel/import`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload Excel');
    return data;
  },

  getExportUrl(params = {}) {
    if (typeof params === 'string') {
      params = { department: params };
    }
    const query = new URLSearchParams();
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.supplier && params.supplier !== 'All') query.append('supplier', params.supplier);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.groupBy && params.groupBy !== 'none') query.append('groupBy', params.groupBy);
    if (params.currency) query.append('currency', params.currency);
    const qStr = query.toString();
    return `${BASE_URL}/excel/export${qStr ? `?${qStr}` : ''}`;
  },

  getTemplateUrl() {
    return `${BASE_URL}/excel/template`;
  },

  // Departments Management
  async getDepartments() {
    const res = await fetch(`${BASE_URL}/departments`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch departments');
    return res.json();
  },

  async createDepartment(deptData) {
    const res = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(deptData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create department');
    return data;
  },

  async deleteDepartment(deptName) {
    const res = await fetch(`${BASE_URL}/departments/${encodeURIComponent(deptName)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete department');
    return data;
  },

  async getCategories(department = 'All') {
    const query = department && department !== 'All' ? `?department=${encodeURIComponent(department)}` : '';
    const res = await fetch(`${BASE_URL}/categories${query}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    return res.json();
  },

  // Purchase Orders
  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.supplier && params.supplier !== 'All') query.append('supplier', params.supplier);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${BASE_URL}/orders?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async getOrder(id) {
    const res = await fetch(`${BASE_URL}/orders/${id}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch order details');
    return res.json();
  },

  async generateOrders({ items, notes, department }) {
    const res = await fetch(`${BASE_URL}/orders/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ items, notes, department })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate orders');
    return data;
  },

  async receiveOrder(id, { received_items, notes, destination }) {
    const res = await fetch(`${BASE_URL}/orders/${id}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ received_items, notes, destination })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process order receipt');
    return data;
  },

  async deleteOrder(id) {
    const res = await fetch(`${BASE_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete order');
    return data;
  }
};

