const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { db, ensureDbInit, seedDemoData } = require('./db');

const app = express();
const PORT = config.PORT;
const JWT_SECRET = config.JWT_SECRET;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure database initialization
app.use(async (req, res, next) => {
  try {
    await ensureDbInit();
    next();
  } catch (err) {
    console.error('Database initialization error:', err);
    res.status(500).json({ error: 'Database initialization failed: ' + err.message });
  }
});

// Serve static frontend in production if built
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Multer storage for Excel uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// Optional auth helper (defaults to demo user if unauthenticated in certain read endpoints)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Demo user accounts list for quick-login helper in UI (hidden in production or if disabled)
app.get('/api/auth/demo-users', async (req, res) => {
  if (!config.ENABLE_DEMO_LOGINS) {
    return res.json([]);
  }

  const users = await db.prepare('SELECT id, username, name, role, department FROM users').all();
  const demoAccounts = users
    .filter(u => ['admin', 'chef_marco', 'bar_sarah', 'hk_elena'].includes(u.username))
    .map(u => ({
      username: u.username,
      name: u.name,
      role: u.role,
      department: u.department,
      password: u.username === 'admin' ? 'admin123' :
                u.username === 'chef_marco' ? 'kitchen123' :
                u.username === 'bar_sarah' ? 'bar123' : 'housekeeping123'
    }));
  res.json(demoAccounts);
});

// Register / Create New User (open if 0 users exist for initial admin setup, or requires Admin token)
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, role, department } = req.body;
  const userCount = (await db.prepare('SELECT COUNT(*) as c FROM users').get()).c;

  if (userCount > 0) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Admin authorization required to create accounts.' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== 'Admin') {
        return res.status(403).json({ error: 'Only Administrators can create new accounts.' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'That username is already registered.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const userRole = role || (userCount === 0 ? 'Admin' : 'Staff');
  const userDept = department || (userCount === 0 ? 'All' : 'Kitchen');

  const insert = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, department)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = await insert.run(username.trim(), hash, name.trim(), userRole, userDept);

  const newUser = {
    id: result.lastInsertRowid,
    username: username.trim(),
    name: name.trim(),
    role: userRole,
    department: userDept
  };

  const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ user: newUser, token, message: 'Account created successfully.' });
});

// Admin System Utility: Clear inventory data (all departments or a specific department)
app.post('/api/system/clear-data', authenticateToken, async (req, res) => {
  const department = req.body?.department || req.body?.scope || 'All';
  const password = req.body?.password;

  if (!password) {
    return res.status(400).json({ error: 'Current password is required to confirm inventory data reset.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect password. Data reset authorization failed.' });
  }

  await db.pragma('foreign_keys = OFF');
  if (department && department !== 'All') {
    await db.prepare('DELETE FROM transactions WHERE department = ?').run(department);
    await db.prepare('DELETE FROM items WHERE department = ?').run(department);
    await db.prepare('DELETE FROM orders WHERE department = ?').run(department);
  } else {
    await db.exec(`
      DELETE FROM transactions;
      DELETE FROM items;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM sqlite_sequence WHERE name IN ('items', 'transactions', 'orders', 'order_items');
    `);
  }
  await db.pragma('foreign_keys = ON');

  const deptMsg = department && department !== 'All' ? `${department} department` : 'All inventory';
  res.json({
    success: true,
    message: `${deptMsg} and related transaction records have been cleared. Ready for your live data!`
  });
});

// Admin System Utility: Re-seed sample data if user wants to test demo items
app.post('/api/system/seed-demo', authenticateToken, async (req, res) => {
  try {
    await seedDemoData();
    res.json({ success: true, message: 'Sample demo items and transactions restored.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reseed: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: payload
  });
});

// Verify current session
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await db.prepare('SELECT id, username, name, role, department, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user });
});

// ==========================================
// 2. DASHBOARD KPI & STATS
// ==========================================

app.get('/api/dashboard/stats', optionalAuth, async (req, res) => {
  const { department } = req.query;

  let baseWhere = '';
  let params = [];
  if (department && department !== 'All') {
    baseWhere = 'WHERE department = ?';
    params = [department];
  }

  // Total items, out of stock, low stock, total valuation
  const overall = await db.prepare(`
    SELECT
      COUNT(*) as total_items,
      SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
      SUM(CASE WHEN current_stock > 0 AND current_stock <= min_threshold THEN 1 ELSE 0 END) as low_stock,
      SUM(CASE WHEN current_stock > min_threshold THEN 1 ELSE 0 END) as in_stock,
      COALESCE(SUM(current_stock * cost_per_unit), 0) as total_valuation
    FROM items
    ${baseWhere}
  `).get(...params);

  // Department breakdown (dynamically queries all active departments)
  const allDeptRows = await db.prepare('SELECT name, icon, color FROM departments ORDER BY id ASC').all();
  const deptsToReport = allDeptRows.length > 0 ? allDeptRows : [
    { name: 'Kitchen', icon: 'Utensils', color: 'text-amber-400' },
    { name: 'Housekeeping', icon: 'Sparkles', color: 'text-teal-400' },
    { name: 'Bar', icon: 'Wine', color: 'text-purple-400' }
  ];
  const departments = await Promise.all(deptsToReport.map(async deptObj => {
    const dept = deptObj.name;
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN current_stock > 0 AND current_stock <= min_threshold THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN current_stock > min_threshold THEN 1 ELSE 0 END) as in_stock,
        COALESCE(SUM(current_stock * cost_per_unit), 0) as total_valuation
      FROM items
      WHERE department = ?
    `).get(dept);
    return {
      department: dept,
      icon: deptObj.icon,
      color: deptObj.color,
      ...stats
    };
  }));

  // Recent transactions summary (today)
  const todayWhere = department && department !== 'All' ? 'AND department = ?' : '';
  const todayParams = department && department !== 'All' ? [department] : [];

  const activityToday = await db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'IN' THEN 1 ELSE 0 END) as stock_in_count,
      SUM(CASE WHEN type = 'OUT' THEN 1 ELSE 0 END) as stock_out_count,
      COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) as stock_in_qty,
      COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) as stock_out_qty
    FROM transactions
    WHERE date(created_at) = date('now') ${todayWhere}
  `).get(...todayParams);

  // Critical alert items (Out of stock and low stock items needing reorder)
  const criticalItems = await db.prepare(`
    SELECT id, name, sku, department, category, current_stock, min_threshold, unit, cost_per_unit, supplier,
      CASE
        WHEN current_stock = 0 THEN 'OUT_OF_STOCK'
        WHEN current_stock <= min_threshold THEN 'LOW_STOCK'
        ELSE 'OK'
      END as status,
      (min_threshold - current_stock) as recommended_reorder
    FROM items
    WHERE current_stock <= min_threshold
    ${department && department !== 'All' ? 'AND department = ?' : ''}
    ORDER BY (CASE WHEN current_stock = 0 THEN 0 ELSE 1 END), (current_stock / CAST(min_threshold AS REAL)) ASC
    LIMIT 10
  `).all(...(department && department !== 'All' ? [department] : []));

  // Pending purchase orders
  const orderWhere = department && department !== 'All' ? "WHERE department = ? AND status = 'PENDING'" : "WHERE status = 'PENDING'";
  const orderParams = department && department !== 'All' ? [department] : [];
  const pendingOrdersCount = (await db.prepare(`SELECT COUNT(*) as count FROM orders ${orderWhere}`).get(...orderParams)).count;

  res.json({
    overall: {
      total_items: overall.total_items || 0,
      out_of_stock: overall.out_of_stock || 0,
      low_stock: overall.low_stock || 0,
      in_stock: overall.in_stock || 0,
      total_valuation: Number((overall.total_valuation || 0).toFixed(2)),
      stock_in_today: activityToday.stock_in_count || 0,
      stock_out_today: activityToday.stock_out_count || 0,
      stock_in_qty_today: activityToday.stock_in_qty || 0,
      stock_out_qty_today: activityToday.stock_out_qty || 0,
      pending_orders: pendingOrdersCount
    },
    departments,
    criticalItems
  });
});

// ==========================================
// 3. INVENTORY ITEMS CRUD & QUERY
// ==========================================

app.get('/api/items', async (req, res) => {
  const { department, search, status, category, sortBy, sortOrder } = req.query;

  let query = `
    SELECT id, name, sku, department, category, current_stock, unit, min_threshold, cost_per_unit, supplier, location, notes, updated_at,
      CASE
        WHEN current_stock = 0 THEN 'out_of_stock'
        WHEN current_stock <= min_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END as status
    FROM items
    WHERE 1=1
  `;
  const params = [];

  if (department && department !== 'All') {
    query += ` AND department = ?`;
    params.push(department);
  }

  if (category && category !== 'All') {
    query += ` AND category = ?`;
    params.push(category);
  }

  if (search && search.trim()) {
    query += ` AND (name LIKE ? OR sku LIKE ? OR category LIKE ? OR supplier LIKE ? OR location LIKE ?)`;
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (status) {
    if (status === 'out_of_stock') {
      query += ` AND current_stock = 0`;
    } else if (status === 'low_stock') {
      query += ` AND current_stock > 0 AND current_stock <= min_threshold`;
    } else if (status === 'in_stock') {
      query += ` AND current_stock > min_threshold`;
    }
  }

  // Sorting
  const validSortCols = {
    name: 'name',
    sku: 'sku',
    current_stock: 'current_stock',
    department: 'department',
    category: 'category',
    min_threshold: 'min_threshold',
    updated_at: 'updated_at',
    cost_per_unit: 'cost_per_unit'
  };

  const sortCol = validSortCols[sortBy] || 'name';
  const order = (sortOrder && sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

  query += ` ORDER BY ${sortCol} ${order}`;

  const items = await db.prepare(query).all(...params);
  res.json(items);
});

// Get single item with its transactions
app.get('/api/items/:id', async (req, res) => {
  const item = await db.prepare(`
    SELECT *,
      CASE
        WHEN current_stock = 0 THEN 'out_of_stock'
        WHEN current_stock <= min_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END as status
    FROM items WHERE id = ?
  `).get(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const transactions = await db.prepare(`
    SELECT * FROM transactions
    WHERE item_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({ item, transactions });
});

// Create item
app.post('/api/items', authenticateToken, async (req, res) => {
  const {
    name,
    sku,
    department,
    category,
    current_stock,
    unit,
    min_threshold,
    cost_per_unit,
    supplier,
    location,
    notes
  } = req.body;

  if (!name || !department || !unit) {
    return res.status(400).json({ error: 'Item Name, Department, and Unit are required.' });
  }

  const validDepts = (await db.prepare('SELECT name FROM departments').all()).map(d => d.name);
  if (!validDepts.includes(department)) {
    return res.status(400).json({ error: `Invalid department "${department}". Active departments are: ${validDepts.join(', ')}` });
  }

  // Auto-generate SKU if not provided
  let generatedSku = sku ? sku.trim().toUpperCase() : null;
  if (!generatedSku) {
    const deptPrefix = department.substring(0, 3).toUpperCase();
    const count = (await db.prepare('SELECT COUNT(*) as c FROM items WHERE department = ?').get(department)).c + 1;
    generatedSku = `${deptPrefix}-${String(count).padStart(3, '0')}`;
  }

  // Check unique SKU
  const existing = await db.prepare('SELECT id FROM items WHERE sku = ?').get(generatedSku);
  if (existing) {
    return res.status(400).json({ error: `An item with SKU "${generatedSku}" already exists.` });
  }

  const stockVal = parseFloat(current_stock) || 0;
  const minVal = parseFloat(min_threshold) >= 0 ? parseFloat(min_threshold) : 5;
  const costVal = parseFloat(cost_per_unit) >= 0 ? parseFloat(cost_per_unit) : 0;
  const catVal = category ? category.trim() : 'General';

  try {
    const insert = db.prepare(`
      INSERT INTO items (name, sku, department, category, current_stock, unit, min_threshold, cost_per_unit, supplier, location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await insert.run(
      name.trim(),
      generatedSku,
      department,
      catVal,
      stockVal,
      unit.trim(),
      minVal,
      costVal,
      supplier ? supplier.trim() : null,
      location ? location.trim() : null,
      notes ? notes.trim() : null
    );

    // Record initial transaction if stock > 0
    if (stockVal > 0) {
      await db.prepare(`
        INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
        VALUES (?, ?, ?, ?, 'INITIAL', ?, 0, ?, ?, 'Initial Manual Entry', 'Item manually created')
      `).run(
        result.lastInsertRowid,
        name.trim(),
        generatedSku,
        department,
        stockVal,
        stockVal,
        req.user.name || req.user.username
      );
    }

    const newItem = await db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item: ' + err.message });
  }
});

// Bulk Update items
app.put('/api/items/bulk', authenticateToken, async (req, res) => {
  const { item_ids, updates, stock_adjustment } = req.body;

  if (!Array.isArray(item_ids) || item_ids.length === 0) {
    return res.status(400).json({ error: 'Please select at least one item to update.' });
  }

  try {
    const updateTx = db.transaction(async () => {
      for (const id of item_ids) {
        const currentItem = await db.prepare('SELECT * FROM items WHERE id = ?').get(id);
        if (!currentItem) continue;

        let newStock = currentItem.current_stock;
        let stockDelta = 0;

        if (stock_adjustment && stock_adjustment.type && stock_adjustment.type !== 'none') {
          const adjVal = parseFloat(stock_adjustment.value);
          if (!isNaN(adjVal)) {
            if (stock_adjustment.type === 'set' && adjVal >= 0) {
              newStock = adjVal;
              stockDelta = newStock - currentItem.current_stock;
            } else if (stock_adjustment.type === 'add' && adjVal > 0) {
              newStock = currentItem.current_stock + adjVal;
              stockDelta = adjVal;
            } else if (stock_adjustment.type === 'deduct' && adjVal > 0) {
              newStock = Math.max(0, currentItem.current_stock - adjVal);
              stockDelta = newStock - currentItem.current_stock;
            }
          }
        }

        const newDept = (updates && updates.department) ? updates.department : currentItem.department;
        const newCategory = (updates && updates.category !== undefined && updates.category !== '') ? updates.category.trim() : currentItem.category;
        const newUnit = (updates && updates.unit !== undefined && updates.unit !== '') ? updates.unit.trim() : currentItem.unit;
        const newMinThreshold = (updates && updates.min_threshold !== undefined && updates.min_threshold !== '') ? parseFloat(updates.min_threshold) : currentItem.min_threshold;
        const newCostPerUnit = (updates && updates.cost_per_unit !== undefined && updates.cost_per_unit !== '') ? parseFloat(updates.cost_per_unit) : currentItem.cost_per_unit;
        const newSupplier = (updates && updates.supplier !== undefined) ? (updates.supplier ? updates.supplier.trim() : null) : currentItem.supplier;
        const newLocation = (updates && updates.location !== undefined) ? (updates.location ? updates.location.trim() : null) : currentItem.location;
        const newNotes = (updates && updates.notes !== undefined) ? (updates.notes ? updates.notes.trim() : null) : currentItem.notes;

        db.prepare(`
          UPDATE items SET
            department = ?,
            category = ?,
            unit = ?,
            min_threshold = ?,
            cost_per_unit = ?,
            supplier = ?,
            location = ?,
            notes = ?,
            current_stock = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          newDept,
          newCategory,
          newUnit,
          newMinThreshold,
          newCostPerUnit,
          newSupplier,
          newLocation,
          newNotes,
          newStock,
          id
        );

        if (stockDelta !== 0) {
          const type = stockDelta > 0 ? 'IN' : 'OUT';
          await db.prepare(`
            INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            currentItem.name,
            currentItem.sku,
            newDept,
            type,
            Math.abs(stockDelta),
            currentItem.current_stock,
            newStock,
            req.user.name || req.user.username,
            stock_adjustment.reason || 'Bulk Stock Adjustment',
            stock_adjustment.notes || `Bulk edit adjusted stock from ${currentItem.current_stock} to ${newStock}`
          );
        }
      }
    });

    await updateTx();
    res.json({ success: true, count: item_ids.length, message: `Successfully updated ${item_ids.length} items.` });
  } catch (err) {
    console.error('Bulk update error:', err);
    res.status(500).json({ error: 'Bulk update failed: ' + err.message });
  }
});

// Bulk Delete items
app.delete('/api/items/bulk', authenticateToken, async (req, res) => {
  const { item_ids } = req.body;

  if (!Array.isArray(item_ids) || item_ids.length === 0) {
    return res.status(400).json({ error: 'Please select at least one item to delete.' });
  }

  try {
    const deleteTx = db.transaction(async () => {
      const placeholders = item_ids.map(() => '?').join(',');
      await db.prepare(`DELETE FROM items WHERE id IN (${placeholders})`).run(...item_ids);
    });

    await deleteTx();
    res.json({ success: true, count: item_ids.length, message: `Successfully deleted ${item_ids.length} items.` });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: 'Bulk delete failed: ' + err.message });
  }
});

// Update item
app.put('/api/items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    sku,
    department,
    category,
    current_stock,
    unit,
    min_threshold,
    cost_per_unit,
    supplier,
    location,
    notes
  } = req.body;

  const currentItem = await db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!currentItem) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  // Check unique SKU if changed
  if (sku && sku.trim().toUpperCase() !== currentItem.sku) {
    const existing = await db.prepare('SELECT id FROM items WHERE sku = ? AND id != ?').get(sku.trim().toUpperCase(), id);
    if (existing) {
      return res.status(400).json({ error: `SKU "${sku}" is already in use by another item.` });
    }
  }

  const updatedStock = current_stock !== undefined ? parseFloat(current_stock) : currentItem.current_stock;
  const stockDelta = updatedStock - currentItem.current_stock;

  const update = db.prepare(`
    UPDATE items SET
      name = COALESCE(?, name),
      sku = COALESCE(?, sku),
      department = COALESCE(?, department),
      category = COALESCE(?, category),
      current_stock = ?,
      unit = COALESCE(?, unit),
      min_threshold = COALESCE(?, min_threshold),
      cost_per_unit = COALESCE(?, cost_per_unit),
      supplier = ?,
      location = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  await update.run(
    name ? name.trim() : null,
    sku ? sku.trim().toUpperCase() : null,
    department,
    category ? category.trim() : null,
    updatedStock,
    unit ? unit.trim() : null,
    min_threshold !== undefined ? parseFloat(min_threshold) : null,
    cost_per_unit !== undefined ? parseFloat(cost_per_unit) : null,
    supplier !== undefined ? (supplier ? supplier.trim() : null) : currentItem.supplier,
    location !== undefined ? (location ? location.trim() : null) : currentItem.location,
    notes !== undefined ? (notes ? notes.trim() : null) : currentItem.notes,
    id
  );

  // If stock was directly changed, record adjustment transaction
  if (stockDelta !== 0) {
    await db.prepare(`
      INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
      VALUES (?, ?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?, 'Manual Adjustment', 'Direct stock count edit in item properties')
    `).run(
      id,
      name || currentItem.name,
      sku || currentItem.sku,
      department || currentItem.department,
      Math.abs(stockDelta),
      currentItem.current_stock,
      updatedStock,
      req.user.name || req.user.username
    );
  }

  const updatedItem = await db.prepare(`
    SELECT *,
      CASE
        WHEN current_stock = 0 THEN 'out_of_stock'
        WHEN current_stock <= min_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END as status
    FROM items WHERE id = ?
  `).get(id);

  res.json(updatedItem);
});

// Delete item
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const item = await db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  await db.prepare('DELETE FROM items WHERE id = ?').run(id);
  res.json({ success: true, message: `Item "${item.name}" deleted successfully.` });
});

// ==========================================
// 4. STOCK IN / STOCK OUT TRANSACTIONS
// ==========================================

// Stock In (Order / Receive Stock)
app.post('/api/transactions/stock-in', authenticateToken, async (req, res) => {
  const { item_id, quantity, destination_or_source, notes } = req.body;

  const qty = parseFloat(quantity);
  if (!item_id || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Please select an item and provide a valid quantity greater than 0.' });
  }

  const item = await db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) {
    return res.status(404).json({ error: 'Selected item does not exist.' });
  }

  const prevStock = item.current_stock;
  const newStock = prevStock + qty;

  const transactionProcess = db.transaction(async () => {
    // 1. Update item stock
    await db.prepare(`
      UPDATE items
      SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStock, item_id);

    // 2. Insert transaction
    const insertTx = db.prepare(`
      INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
      VALUES (?, ?, ?, ?, 'IN', ?, ?, ?, ?, ?, ?)
    `);

    const txInfo = await insertTx.run(
      item.id,
      item.name,
      item.sku,
      item.department,
      qty,
      prevStock,
      newStock,
      req.user.name || req.user.username,
      destination_or_source ? destination_or_source.trim() : 'Inbound Supplier Delivery',
      notes ? notes.trim() : ''
    );

    return { txId: txInfo.lastInsertRowid, newStock };
  });

  const result = await transactionProcess();

  const updatedItem = await db.prepare(`
    SELECT *,
      CASE
        WHEN current_stock = 0 THEN 'out_of_stock'
        WHEN current_stock <= min_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END as status
    FROM items WHERE id = ?
  `).get(item_id);

  res.json({
    success: true,
    message: `Received ${qty} ${item.unit} of "${item.name}". New stock: ${newStock} ${item.unit}.`,
    item: updatedItem,
    transactionId: result.txId
  });
});

// Stock Out (Issue Stock)
app.post('/api/transactions/stock-out', authenticateToken, async (req, res) => {
  const { item_id, quantity, destination_or_source, notes, allow_negative } = req.body;

  const qty = parseFloat(quantity);
  if (!item_id || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Please select an item and provide a valid quantity greater than 0.' });
  }

  const item = await db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) {
    return res.status(404).json({ error: 'Selected item does not exist.' });
  }

  if (item.current_stock < qty && !allow_negative) {
    return res.status(400).json({
      error: `Cannot issue ${qty} ${item.unit}. Current stock is only ${item.current_stock} ${item.unit}.`,
      current_stock: item.current_stock,
      unit: item.unit
    });
  }

  const prevStock = item.current_stock;
  const newStock = Math.max(0, prevStock - qty); // Prevent negative unless specifically configured

  const transactionProcess = db.transaction(async () => {
    // 1. Update item stock
    await db.prepare(`
      UPDATE items
      SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStock, item_id);

    // 2. Insert transaction
    const insertTx = db.prepare(`
      INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
      VALUES (?, ?, ?, ?, 'OUT', ?, ?, ?, ?, ?, ?)
    `);

    const txInfo = await insertTx.run(
      item.id,
      item.name,
      item.sku,
      item.department,
      qty,
      prevStock,
      newStock,
      req.user.name || req.user.username,
      destination_or_source ? destination_or_source.trim() : 'Issued to Department Station',
      notes ? notes.trim() : ''
    );

    return { txId: txInfo.lastInsertRowid, newStock };
  });

  const result = await transactionProcess();

  const updatedItem = await db.prepare(`
    SELECT *,
      CASE
        WHEN current_stock = 0 THEN 'out_of_stock'
        WHEN current_stock <= min_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END as status
    FROM items WHERE id = ?
  `).get(item_id);

  res.json({
    success: true,
    message: `Issued ${qty} ${item.unit} of "${item.name}". Remaining stock: ${newStock} ${item.unit}.`,
    item: updatedItem,
    transactionId: result.txId
  });
});

// Quick Stock Tally (+1 or -1 or delta) directly from row
app.post('/api/transactions/quick-adjust', authenticateToken, async (req, res) => {
  const { item_id, delta, reason } = req.body;
  const numDelta = parseFloat(delta);
  if (!item_id || isNaN(numDelta) || numDelta === 0) {
    return res.status(400).json({ error: 'Invalid delta value.' });
  }

  const item = await db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const prevStock = item.current_stock;
  const newStock = Math.max(0, prevStock + numDelta);
  const actualChanged = Math.abs(newStock - prevStock);
  const type = numDelta > 0 ? 'IN' : 'OUT';

  await db.transaction(async () => {
    await db.prepare('UPDATE items SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, item_id);
    await db.prepare(`
      INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.name,
      item.sku,
      item.department,
      type,
      actualChanged,
      prevStock,
      newStock,
      req.user.name || req.user.username,
      reason || 'Quick Tally Adjustment',
      `Inline table quick adjust (${numDelta > 0 ? '+' : ''}${numDelta})`
    );
  })();

  const updatedItem = await db.prepare(`
    SELECT *,
      CASE
        WHEN current_stock = 0 THEN 'out_of_stock'
        WHEN current_stock <= min_threshold THEN 'low_stock'
        ELSE 'in_stock'
      END as status
    FROM items WHERE id = ?
  `).get(item_id);

  res.json({ success: true, item: updatedItem });
});

// Transaction History Log Query
app.get('/api/transactions', async (req, res) => {
  const { department, type, item_id, search, limit, offset } = req.query;

  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (department && department !== 'All') {
    query += ' AND department = ?';
    params.push(department);
  }

  if (type && type !== 'All') {
    query += ' AND type = ?';
    params.push(type.toUpperCase());
  }

  if (item_id) {
    query += ' AND item_id = ?';
    params.push(item_id);
  }

  if (search && search.trim()) {
    query += ' AND (item_name LIKE ? OR sku LIKE ? OR user_name LIKE ? OR destination_or_source LIKE ? OR notes LIKE ?)';
    const p = `%${search.trim()}%`;
    params.push(p, p, p, p, p);
  }

  query += ' ORDER BY created_at DESC';

  const lim = parseInt(limit) || 100;
  const off = parseInt(offset) || 0;
  query += ` LIMIT ${lim} OFFSET ${off}`;

  const transactions = await db.prepare(query).all(...params);
  res.json(transactions);
});

// ==========================================
// 5. PURCHASE ORDERS & VENDOR MANAGEMENT
// ==========================================

// Get all orders with line items
app.get('/api/orders', optionalAuth, async (req, res) => {
  const { department, status, supplier, search } = req.query;

  let where = [];
  let params = [];

  if (department && department !== 'All') {
    where.push('department = ?');
    params.push(department);
  }
  if (status && status !== 'All') {
    where.push('status = ?');
    params.push(status);
  }
  if (supplier && supplier !== 'All') {
    where.push('supplier = ?');
    params.push(supplier);
  }
  if (search && search.trim()) {
    where.push('(order_number LIKE ? OR supplier LIKE ? OR notes LIKE ?)');
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const orders = await db.prepare(`SELECT * FROM orders ${whereClause} ORDER BY created_at DESC`).all(...params);

  const getItemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const result = await Promise.all(orders.map(async ord => ({
    ...ord,
    items: await getItemsStmt.all(ord.id)
  })));

  res.json(result);
});

// Get single order with line items
app.get('/api/orders/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  res.json({ ...order, items });
});

// Generate vendor orders from selected items list
app.post('/api/orders/generate', authenticateToken, async (req, res) => {
  const { items: orderItems, notes, department } = req.body;

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one item to order.' });
  }

  try {
    // 1. Group items by Vendor and Department
    const groups = {};

    for (const entry of orderItems) {
      const dbItem = await db.prepare('SELECT * FROM items WHERE id = ?').get(entry.item_id);
      if (!dbItem) continue;

      const vendor = (entry.supplier || dbItem.supplier || 'General Supplier').trim();
      const dept = dbItem.department || department || 'Kitchen';
      const key = `${vendor}___${dept}`;

      if (!groups[key]) {
        groups[key] = {
          supplier: vendor,
          department: dept,
          items: []
        };
      }

      const qty = Math.max(0.01, parseFloat(entry.quantity) || 1);
      const unitCost = entry.unit_cost !== undefined ? parseFloat(entry.unit_cost) : (dbItem.cost_per_unit || 0);

      groups[key].items.push({
        item_id: dbItem.id,
        name: dbItem.name,
        sku: dbItem.sku,
        quantity: qty,
        unit: entry.unit || dbItem.unit || 'units',
        unit_cost: unitCost,
        total_cost: qty * unitCost
      });
    }

    const groupKeys = Object.keys(groups);
    if (groupKeys.length === 0) {
      return res.status(400).json({ error: 'No valid inventory items found to create orders.' });
    }

    const createdOrders = [];

    const generateTx = db.transaction(async () => {
      for (const key of groupKeys) {
        const grp = groups[key];
        const orderNumber = `PO-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
        const totalItems = grp.items.length;
        const totalCost = grp.items.reduce((sum, i) => sum + i.total_cost, 0);

        const insertOrderStmt = db.prepare(`
          INSERT INTO orders (order_number, supplier, department, status, total_items, total_cost, notes, created_by)
          VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?)
        `);

        const orderRes = await insertOrderStmt.run(
          orderNumber,
          grp.supplier,
          grp.department,
          totalItems,
          totalCost,
          notes ? notes.trim() : `Automated vendor order for ${grp.supplier}`,
          req.user.name || req.user.username
        );

        const orderId = orderRes.lastInsertRowid;

        const insertItemStmt = db.prepare(`
          INSERT INTO order_items (order_id, item_id, item_name, sku, ordered_quantity, received_quantity, unit, unit_cost, total_cost)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
        `);

        for (const itm of grp.items) {
          await insertItemStmt.run(
            orderId,
            itm.item_id,
            itm.name,
            itm.sku,
            itm.quantity,
            itm.unit,
            itm.unit_cost,
            itm.total_cost
          );
        }

        createdOrders.push({
          id: orderId,
          order_number: orderNumber,
          supplier: grp.supplier,
          department: grp.department,
          total_items: totalItems,
          total_cost: totalCost,
          status: 'PENDING'
        });
      }
    });

    await generateTx();

    res.status(201).json({
      success: true,
      count: createdOrders.length,
      orders: createdOrders,
      message: `Successfully created ${createdOrders.length} vendor purchase order(s).`
    });
  } catch (err) {
    console.error('Order generation error:', err);
    res.status(500).json({ error: 'Failed to generate orders: ' + err.message });
  }
});

// Mark order as received & immediately update stock with custom received quantities
app.post('/api/orders/:id/receive', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { received_items, notes, destination } = req.body || {};

  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (order.status === 'RECEIVED') {
    return res.status(400).json({ error: 'This order has already been marked as received.' });
  }

  const orderLineItems = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

  try {
    const receiveTx = db.transaction(async () => {
      for (const line of orderLineItems) {
        // Find matching received quantity submitted by user, or default to ordered_quantity
        let recQty = line.ordered_quantity;
        if (Array.isArray(received_items)) {
          const match = received_items.find(ri => ri.order_item_id === line.id || ri.item_id === line.item_id);
          if (match && match.received_quantity !== undefined) {
            recQty = Math.max(0, parseFloat(match.received_quantity) || 0);
          }
        }

        // Update line item record
        await db.prepare('UPDATE order_items SET received_quantity = ? WHERE id = ?').run(recQty, line.id);

        // Update inventory item stock immediately if item exists
        if (line.item_id) {
          const inventoryItem = await db.prepare('SELECT * FROM items WHERE id = ?').get(line.item_id);
          if (inventoryItem) {
            const prevStock = inventoryItem.current_stock;
            const newStock = prevStock + recQty;

            await db.prepare('UPDATE items SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, line.item_id);

            if (recQty > 0) {
              await db.prepare(`
                INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
                VALUES (?, ?, ?, ?, 'IN', ?, ?, ?, ?, ?, ?)
              `).run(
                inventoryItem.id,
                inventoryItem.name,
                inventoryItem.sku,
                inventoryItem.department,
                recQty,
                prevStock,
                newStock,
                req.user.name || req.user.username,
                destination ? destination.trim() : `PO ${order.order_number} Received`,
                `Vendor: ${order.supplier}. Ordered: ${line.ordered_quantity} ${line.unit}, Received: ${recQty} ${line.unit}. ${notes || ''}`.trim()
              );
            }
          }
        }
      }

      // Mark order as RECEIVED
      await db.prepare(`
        UPDATE orders SET
          status = 'RECEIVED',
          received_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    });

    await receiveTx();

    const updatedOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const updatedLines = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

    res.json({
      success: true,
      message: `Order ${order.order_number} marked as received. Inventory stock updated immediately!`,
      order: {
        ...updatedOrder,
        items: updatedLines
      }
    });
  } catch (err) {
    console.error('Receive order error:', err);
    res.status(500).json({ error: 'Failed to process order receipt: ' + err.message });
  }
});

// Delete / Cancel Order
app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  await db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  res.json({ success: true, message: `Order ${order.order_number} deleted.` });
});

// ==========================================
// 6. EXCEL IMPORT & EXPORT
// ==========================================

// Parse and import Excel / CSV file
app.post('/api/excel/import', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an Excel (.xlsx, .xls) or CSV file.' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty or has no readable rows.' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const errors = [];

    const findItemBySku = db.prepare('SELECT * FROM items WHERE sku = ?');
    const findItemByNameAndDept = db.prepare('SELECT * FROM items WHERE LOWER(name) = LOWER(?) AND department = ?');

    const insertItemStmt = db.prepare(`
      INSERT INTO items (name, sku, department, category, current_stock, unit, min_threshold, cost_per_unit, supplier, location, notes)
      VALUES (@name, @sku, @department, @category, @current_stock, @unit, @min_threshold, @cost_per_unit, @supplier, @location, @notes)
    `);

    const updateItemStmt = db.prepare(`
      UPDATE items SET
        name = @name,
        department = @department,
        category = @category,
        current_stock = @current_stock,
        unit = @unit,
        min_threshold = @min_threshold,
        cost_per_unit = @cost_per_unit,
        supplier = @supplier,
        location = @location,
        notes = @notes,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    const insertTxStmt = db.prepare(`
      INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
      VALUES (?, ?, ?, ?, 'INITIAL', ?, ?, ?, ?, 'Excel Bulk Import', 'Imported via spreadsheet upload')
    `);

    // Helper to normalize column names regardless of casing or formatting
    function getVal(row, keys) {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return row[k];
        // Case-insensitive check
        const matchedKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
          return row[matchedKey];
        }
      }
      return null;
    }

    const processImport = db.transaction(async (rows) => {
      for (const [idx, row] of rows.entries()) {
        const rowNum = idx + 2; // header is row 1

        const name = getVal(row, ['Item Name', 'ItemName', 'Name', 'Product Name', 'Description', 'Item']);
        if (!name) {
          errors.push(`Row ${rowNum}: Skipped because "Item Name" is missing.`);
          return;
        }

        let department = getVal(row, ['Department', 'Dept', 'Division', 'Section']);
        // Normalize department
        if (!department || !department.toString().trim()) {
          department = 'Kitchen'; // default fallback
        } else {
          const rawDept = department.toString().trim();
          const deptLower = rawDept.toLowerCase();
          if (deptLower.includes('kitch') || deptLower.includes('food') || deptLower.includes('cook')) {
            department = 'Kitchen';
          } else if (deptLower.includes('bar') || deptLower.includes('bever') || deptLower.includes('liquor')) {
            department = 'Bar';
          } else if (deptLower.includes('house') || deptLower.includes('clean') || deptLower.includes('hk') || deptLower.includes('room')) {
            department = 'Housekeeping';
          } else {
            // Check if matching an existing department case-insensitively
            const matched = await db.prepare('SELECT name FROM departments WHERE LOWER(name) = LOWER(?)').get(rawDept);
            if (matched) {
              department = matched.name;
            } else {
              // Proper case custom department and register
              department = rawDept.charAt(0).toUpperCase() + rawDept.slice(1);
              try {
                await db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)').run(department);
              } catch (e) {}
            }
          }
        }

        let sku = getVal(row, ['SKU', 'Sku', 'Code', 'Item Code', 'Item SKU']);
        if (!sku) {
          const prefix = department.substring(0, 3).toUpperCase();
          const rand = Math.floor(100 + Math.random() * 900);
          sku = `${prefix}-GEN-${Date.now().toString().slice(-4)}${rand}`;
        } else {
          sku = sku.toString().trim().toUpperCase();
        }

        const category = getVal(row, ['Category', 'Group', 'Subcategory', 'Type']) || 'General';
        const rawStock = getVal(row, ['Initial Count', 'Current Stock', 'Stock', 'Count', 'Qty', 'Quantity']);
        const current_stock = parseFloat(rawStock) >= 0 ? parseFloat(rawStock) : 0;
        const unit = getVal(row, ['Unit', 'UOM', 'Measurement', 'Unit of Measure']) || 'units';
        const rawMin = getVal(row, ['Minimum Threshold', 'Min Threshold', 'Threshold', 'Min Stock', 'Par Level', 'Reorder Level']);
        const min_threshold = parseFloat(rawMin) >= 0 ? parseFloat(rawMin) : 5;
        const rawCost = getVal(row, ['Unit Cost', 'Cost Per Unit', 'Cost', 'Price', 'Rate']);
        const cost_per_unit = parseFloat(rawCost) >= 0 ? parseFloat(rawCost) : 0;
        const supplier = getVal(row, ['Supplier', 'Vendor']) || null;
        const location = getVal(row, ['Location', 'Shelf', 'Bin', 'Storage Area']) || null;
        const notes = getVal(row, ['Notes', 'Comment', 'Remarks']) || 'Imported via Excel';

        // Check if item exists by SKU or by Name + Dept
        let existing = await findItemBySku.get(sku);
        if (!existing) {
          existing = await findItemByNameAndDept.get(name.toString().trim(), department);
        }

        if (existing) {
          // Update existing item
          const prevStock = existing.current_stock;
          await updateItemStmt.run({
            id: existing.id,
            name: name.toString().trim(),
            department,
            category: category.toString().trim(),
            current_stock,
            unit: unit.toString().trim(),
            min_threshold,
            cost_per_unit,
            supplier,
            location,
            notes
          });
          updatedCount++;

          if (current_stock !== prevStock) {
            await insertTxStmt.run(
              existing.id,
              name.toString().trim(),
              existing.sku,
              department,
              current_stock,
              prevStock,
              current_stock,
              req.user.name || req.user.username
            );
          }
        } else {
          // Insert new item
          const info = await insertItemStmt.run({
            name: name.toString().trim(),
            sku,
            department,
            category: category.toString().trim(),
            current_stock,
            unit: unit.toString().trim(),
            min_threshold,
            cost_per_unit,
            supplier,
            location,
            notes
          });
          insertedCount++;

          await insertTxStmt.run(
            info.lastInsertRowid,
            name.toString().trim(),
            sku,
            department,
            current_stock,
            0,
            current_stock,
            req.user.name || req.user.username
          );
        }
      }
    });

    await processImport(rawRows);

    res.json({
      success: true,
      message: `Excel processed successfully: ${insertedCount} new items created, ${updatedCount} existing items updated.`,
      inserted: insertedCount,
      updated: updatedCount,
      totalRows: rawRows.length,
      errors
    });
  } catch (err) {
    console.error('Excel import error:', err);
    res.status(500).json({ error: 'Failed to process Excel file: ' + err.message });
  }
});

// Export current inventory to Excel
// Export current inventory to Excel (supports department-wise, seller-wise, and filtered exports)
app.get('/api/excel/export', async (req, res) => {
  const {
    department = 'All',
    supplier = 'All',
    status = 'All',
    groupBy = 'none',
    currency = '₹'
  } = req.query;

  let baseQuery = `
    SELECT
      id,
      sku,
      name,
      department,
      category,
      current_stock,
      unit,
      min_threshold,
      cost_per_unit,
      supplier,
      location,
      notes,
      updated_at
    FROM items
    WHERE 1=1
  `;
  const params = [];

  if (department && department !== 'All') {
    baseQuery += ' AND department = ?';
    params.push(department);
  }

  if (supplier && supplier !== 'All') {
    baseQuery += ' AND supplier = ?';
    params.push(supplier);
  }

  if (status === 'out') {
    baseQuery += ' AND current_stock = 0';
  } else if (status === 'low') {
    baseQuery += ' AND current_stock > 0 AND current_stock <= min_threshold';
  } else if (status === 'in') {
    baseQuery += ' AND current_stock > min_threshold';
  } else if (status === 'alert') {
    baseQuery += ' AND current_stock <= min_threshold';
  }

  baseQuery += ' ORDER BY department, supplier, category, name';

  const items = await db.prepare(baseQuery).all(...params);
  const curSymbol = currency || '₹';

  const mapItemRow = (item) => ({
    'SKU': item.sku || '',
    'Item Name': item.name || '',
    'Department': item.department || '',
    'Category': item.category || '',
    'Current Stock': item.current_stock || 0,
    'Unit': item.unit || 'pcs',
    'Min Threshold': item.min_threshold || 0,
    [`Unit Cost (${curSymbol})`]: Number(parseFloat(item.cost_per_unit || 0).toFixed(2)),
    [`Total Value (${curSymbol})`]: Number((parseFloat(item.current_stock || 0) * parseFloat(item.cost_per_unit || 0)).toFixed(2)),
    'Stock Status': item.current_stock === 0 ? 'Out of Stock' : (item.current_stock <= item.min_threshold ? 'Low Stock' : 'In Stock'),
    'Supplier / Seller': item.supplier || 'Unassigned',
    'Storage Location': item.location || '',
    'Last Updated': item.updated_at || ''
  });

  const colWidths = [
    { wch: 16 }, // SKU
    { wch: 32 }, // Item Name
    { wch: 15 }, // Department
    { wch: 18 }, // Category
    { wch: 14 }, // Current Stock
    { wch: 10 }, // Unit
    { wch: 16 }, // Min Threshold
    { wch: 16 }, // Unit Cost
    { wch: 16 }, // Total Value
    { wch: 14 }, // Stock Status
    { wch: 26 }, // Supplier
    { wch: 20 }, // Location
    { wch: 20 }  // Last Updated
  ];

  const sanitizeSheet = (name, fallback = 'Sheet') => {
    const clean = (name || fallback).replace(/[\\/?*:[\]]/g, '').trim();
    return (clean.slice(0, 30) || fallback);
  };

  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().slice(0, 10);
  let filename = `Inventory_Stock_${dateStr}.xlsx`;

  if (groupBy === 'supplier') {
    filename = `Stock_Seller_Wise_${dateStr}.xlsx`;

    // Group items by supplier
    const supplierGroups = {};
    items.forEach(it => {
      const sup = (it.supplier && it.supplier.trim()) ? it.supplier.trim() : 'Unassigned Sellers';
      if (!supplierGroups[sup]) supplierGroups[sup] = [];
      supplierGroups[sup].push(it);
    });

    // Sheet 1: Seller Summary
    const summaryRows = Object.keys(supplierGroups).sort().map(supName => {
      const supItems = supplierGroups[supName];
      const totalUnits = supItems.reduce((s, i) => s + (parseFloat(i.current_stock) || 0), 0);
      const totalVal = supItems.reduce((s, i) => s + ((parseFloat(i.current_stock) || 0) * (parseFloat(i.cost_per_unit) || 0)), 0);
      const outCount = supItems.filter(i => i.current_stock === 0).length;
      const lowCount = supItems.filter(i => i.current_stock > 0 && i.current_stock <= i.min_threshold).length;
      const inCount = supItems.filter(i => i.current_stock > i.min_threshold).length;

      return {
        'Seller / Supplier': supName,
        'SKUs Count': supItems.length,
        'Total Stock Units': totalUnits,
        'In Stock SKUs': inCount,
        'Low Stock SKUs': lowCount,
        'Out of Stock SKUs': outCount,
        [`Total Valuation (${curSymbol})`]: Number(totalVal.toFixed(2))
      };
    });

    // Grand total row for summary
    const grandUnits = summaryRows.reduce((s, r) => s + r['Total Stock Units'], 0);
    const grandVal = summaryRows.reduce((s, r) => s + r[`Total Valuation (${curSymbol})`], 0);
    summaryRows.push({
      'Seller / Supplier': '--- GRAND TOTAL ---',
      'SKUs Count': items.length,
      'Total Stock Units': grandUnits,
      'In Stock SKUs': summaryRows.reduce((s, r) => s + (r['In Stock SKUs'] || 0), 0),
      'Low Stock SKUs': summaryRows.reduce((s, r) => s + (r['Low Stock SKUs'] || 0), 0),
      'Out of Stock SKUs': summaryRows.reduce((s, r) => s + (r['Out of Stock SKUs'] || 0), 0),
      [`Total Valuation (${curSymbol})`]: Number(grandVal.toFixed(2))
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Sellers_Summary');

    // Individual sheets for each seller
    const usedNames = new Set(['sellers_summary']);
    Object.keys(supplierGroups).sort().forEach(supName => {
      let sheetName = sanitizeSheet(supName, 'Seller');
      let counter = 2;
      while (usedNames.has(sheetName.toLowerCase())) {
        sheetName = `${sanitizeSheet(supName, 'Seller').slice(0, 27)}_${counter++}`;
      }
      usedNames.add(sheetName.toLowerCase());

      const wsSeller = XLSX.utils.json_to_sheet(supplierGroups[supName].map(mapItemRow));
      wsSeller['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsSeller, sheetName);
    });

  } else if (groupBy === 'department') {
    filename = `Stock_Department_Wise_${dateStr}.xlsx`;

    // Group items by department (dynamically loads registered departments)
    const allDbDepts = (await db.prepare('SELECT name FROM departments ORDER BY id ASC').all()).map(d => d.name);
    const deptGroups = {};
    (allDbDepts.length > 0 ? allDbDepts : ['Kitchen', 'Housekeeping', 'Bar']).forEach(d => {
      deptGroups[d] = [];
    });
    items.forEach(it => {
      const d = it.department || 'Unassigned';
      if (!deptGroups[d]) deptGroups[d] = [];
      deptGroups[d].push(it);
    });

    // Sheet 1: Department Summary
    const summaryRows = Object.keys(deptGroups).map(deptName => {
      const dItems = deptGroups[deptName] || [];
      const totalUnits = dItems.reduce((s, i) => s + (parseFloat(i.current_stock) || 0), 0);
      const totalVal = dItems.reduce((s, i) => s + ((parseFloat(i.current_stock) || 0) * (parseFloat(i.cost_per_unit) || 0)), 0);
      const outCount = dItems.filter(i => i.current_stock === 0).length;
      const lowCount = dItems.filter(i => i.current_stock > 0 && i.current_stock <= i.min_threshold).length;
      const inCount = dItems.filter(i => i.current_stock > i.min_threshold).length;

      return {
        'Department': deptName,
        'SKUs Count': dItems.length,
        'Total Stock Units': totalUnits,
        'In Stock SKUs': inCount,
        'Low Stock SKUs': lowCount,
        'Out of Stock SKUs': outCount,
        [`Total Valuation (${curSymbol})`]: Number(totalVal.toFixed(2))
      };
    });

    // Grand total row
    const grandUnits = summaryRows.reduce((s, r) => s + r['Total Stock Units'], 0);
    const grandVal = summaryRows.reduce((s, r) => s + r[`Total Valuation (${curSymbol})`], 0);
    summaryRows.push({
      'Department': '--- ALL DEPARTMENTS ---',
      'SKUs Count': items.length,
      'Total Stock Units': grandUnits,
      'In Stock SKUs': summaryRows.reduce((s, r) => s + (r['In Stock SKUs'] || 0), 0),
      'Low Stock SKUs': summaryRows.reduce((s, r) => s + (r['Low Stock SKUs'] || 0), 0),
      'Out of Stock SKUs': summaryRows.reduce((s, r) => s + (r['Out of Stock SKUs'] || 0), 0),
      [`Total Valuation (${curSymbol})`]: Number(grandVal.toFixed(2))
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Departments_Summary');

    // Individual sheet for each department
    Object.keys(deptGroups).forEach(deptName => {
      const dItems = deptGroups[deptName];
      if (dItems && dItems.length > 0) {
        const wsDept = XLSX.utils.json_to_sheet(dItems.map(mapItemRow));
        wsDept['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, wsDept, deptName);
      }
    });

  } else {
    // Single Flat Sheet with selected filters
    let sheetLabel = 'Current_Stock';
    if (department && department !== 'All') {
      sheetLabel = `${department}_Stock`;
      filename = `Stock_${department}_${dateStr}.xlsx`;
    }
    if (supplier && supplier !== 'All') {
      sheetLabel = `${sanitizeSheet(supplier, 'Seller')}_Stock`;
      filename = `Stock_${sanitizeSheet(supplier, 'Seller').replace(/\s+/g, '_')}_${dateStr}.xlsx`;
    }

    const ws = XLSX.utils.json_to_sheet(items.map(mapItemRow));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheet(sheetLabel));
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// Download sample import template
app.get('/api/excel/template', async (req, res) => {
  const templatePath = path.join(__dirname, '../client/public/sample_inventory_template.xlsx');
  if (fs.existsSync(templatePath)) {
    return res.download(templatePath, 'sample_inventory_template.xlsx');
  }
  res.status(404).json({ error: 'Template file not found.' });
});

// ==========================================
// DEPARTMENTS API (Add, Remove, List)
// ==========================================

// Get all active departments with live stats
app.get('/api/departments', async (req, res) => {
  try {
    const depts = await db.prepare('SELECT id, name, icon, color, description, created_at FROM departments ORDER BY id ASC').all();

    // Enrich with item counts and health statistics
    const enriched = await Promise.all(depts.map(async d => {
      const stats = await db.prepare(`
        SELECT
          COUNT(*) as total_items,
          SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(CASE WHEN current_stock > 0 AND current_stock <= min_threshold THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN current_stock > min_threshold THEN 1 ELSE 0 END) as in_stock,
          COALESCE(SUM(current_stock * cost_per_unit), 0) as total_valuation
        FROM items
        WHERE department = ?
      `).get(d.name);

      return {
        ...d,
        ...stats
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments: ' + err.message });
  }
});

// Add a new department (Admin only)
app.post('/api/departments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Administrators can create new departments.' });
  }

  const { name, icon, color, description } = req.body;
  const trimmedName = name && name.trim();

  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 35) {
    return res.status(400).json({ error: 'Department name is required and must be between 2 and 35 characters.' });
  }

  if (trimmedName.toLowerCase() === 'all') {
    return res.status(400).json({ error: '"All" is a reserved keyword and cannot be used as a department name.' });
  }

  // Check unique
  const existing = await db.prepare('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)').get(trimmedName);
  if (existing) {
    return res.status(400).json({ error: `A department named "${trimmedName}" already exists.` });
  }

  try {
    const defaultColor = color || 'text-indigo-400';
    const defaultIcon = icon || 'Layers';
    const desc = description ? description.trim() : '';

    const result = await db.prepare(`
      INSERT INTO departments (name, icon, color, description)
      VALUES (?, ?, ?, ?)
    `).run(trimmedName, defaultIcon, defaultColor, desc);

    // Audit log
    await db.prepare(`
      INSERT INTO transactions (item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
      VALUES (?, ?, ?, 'ADJUSTMENT', 0, 0, 0, ?, 'System Configuration', ?)
    `).run(
      `Department Created: ${trimmedName}`,
      'DEPT-SYS',
      trimmedName,
      req.user.name || req.user.username,
      `Administrator added department "${trimmedName}"`
    );

    const created = await db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: `Department "${trimmedName}" created successfully.`,
      department: {
        ...created,
        total_items: 0,
        out_of_stock: 0,
        low_stock: 0,
        in_stock: 0,
        total_valuation: 0
      }
    });
  } catch (err) {
    console.error('Error creating department:', err);
    res.status(500).json({ error: 'Failed to create department: ' + err.message });
  }
});

// Remove a department (Admin only)
app.delete('/api/departments/:name', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Administrators can remove departments.' });
  }

  const deptName = req.params.name;
  if (!deptName || deptName.toLowerCase() === 'all') {
    return res.status(400).json({ error: 'Cannot remove this department.' });
  }

  const dept = await db.prepare('SELECT * FROM departments WHERE LOWER(name) = LOWER(?)').get(deptName);
  if (!dept) {
    return res.status(404).json({ error: `Department "${deptName}" was not found.` });
  }

  // Prevent removing if only 1 department remains
  const totalDepts = (await db.prepare('SELECT COUNT(*) as c FROM departments').get()).c;
  if (totalDepts <= 1) {
    return res.status(400).json({ error: 'Cannot remove the last remaining department. At least one department is required.' });
  }

  // Prevent removing if items are assigned to this department
  const itemCount = (await db.prepare('SELECT COUNT(*) as c FROM items WHERE department = ?').get(dept.name)).c;
  if (itemCount > 0) {
    return res.status(400).json({
      error: `Cannot remove "${dept.name}" because it currently has ${itemCount} active item${itemCount > 1 ? 's' : ''}. Please reassign or delete these items first.`
    });
  }

  // Prevent removing if pending orders exist
  const pendingOrders = (await db.prepare("SELECT COUNT(*) as c FROM orders WHERE department = ? AND status = 'PENDING'").get(dept.name)).c;
  if (pendingOrders > 0) {
    return res.status(400).json({
      error: `Cannot remove "${dept.name}" because it has ${pendingOrders} pending purchase order${pendingOrders > 1 ? 's' : ''}.`
    });
  }

  try {
    await db.prepare('DELETE FROM departments WHERE id = ?').run(dept.id);

    // Audit log
    await db.prepare(`
      INSERT INTO transactions (item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes)
      VALUES (?, ?, ?, 'ADJUSTMENT', 0, 0, 0, ?, 'System Configuration', ?)
    `).run(
      `Department Removed: ${dept.name}`,
      'DEPT-SYS',
      dept.name,
      req.user.name || req.user.username,
      `Administrator removed department "${dept.name}"`
    );

    res.json({
      success: true,
      message: `Department "${dept.name}" removed successfully.`,
      department: dept
    });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ error: 'Failed to delete department: ' + err.message });
  }
});

// Categories list helper for filters and dropdowns
app.get('/api/categories', async (req, res) => {
  const { department } = req.query;
  let query = 'SELECT DISTINCT category, department FROM items WHERE 1=1';
  const params = [];
  if (department && department !== 'All') {
    query += ' AND department = ?';
    params.push(department);
  }
  query += ' ORDER BY department, category';
  const categories = await db.prepare(query).all(...params);
  res.json(categories);
});

// Fallback for SPA routing in production
if (fs.existsSync(clientDistPath)) {
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Start Server if run directly
if (process.env.VERCEL) {
  module.exports = app;
} else if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Restaurant Stock Management Server running on port ${PORT}`);
  });
}

module.exports = app;
