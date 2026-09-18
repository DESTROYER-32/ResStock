const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('./config');

const dbPath = path.join(__dirname, 'inventory.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for reliability
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL CHECK(department IN ('Kitchen', 'Housekeeping', 'Bar')),
      category TEXT NOT NULL,
      current_stock REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      min_threshold REAL NOT NULL DEFAULT 5,
      cost_per_unit REAL NOT NULL DEFAULT 0.0,
      supplier TEXT,
      location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      department TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('IN', 'OUT', 'ADJUSTMENT', 'INITIAL')),
      quantity REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      user_name TEXT NOT NULL,
      destination_or_source TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
    );
  `);

  // Purchase Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      supplier TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'RECEIVED', 'CANCELLED')) DEFAULT 'PENDING',
      total_items INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      received_at DATETIME
    );
  `);

  // Order Items line table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      ordered_quantity REAL NOT NULL,
      received_quantity REAL DEFAULT 0,
      unit TEXT NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0.0,
      total_cost REAL NOT NULL DEFAULT 0.0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
    );
  `);

  // Initialize Administrator & Staff users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const adminPasswordHash = bcrypt.hashSync(config.ADMIN_PASSWORD, 10);

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, department)
    VALUES (?, ?, ?, ?, ?)
  `);

  if (userCount === 0) {
    if (config.SEED_DEMO_DATA) {
      const chefHash = bcrypt.hashSync('kitchen123', 10);
      const barHash = bcrypt.hashSync('bar123', 10);
      const hkHash = bcrypt.hashSync('housekeeping123', 10);

      insertUser.run(config.ADMIN_USERNAME, adminPasswordHash, config.ADMIN_NAME, 'Admin', 'All');
      insertUser.run('chef_marco', chefHash, 'Marco Rossi (Executive Chef)', 'Kitchen Manager', 'Kitchen');
      insertUser.run('bar_sarah', barHash, 'Sarah Jenkins (Head Mixologist)', 'Bar Manager', 'Bar');
      insertUser.run('hk_elena', hkHash, 'Elena Rostova (Operations Lead)', 'Housekeeping Lead', 'Housekeeping');
      console.log(`Default users seeded with admin username: "${config.ADMIN_USERNAME}".`);
    } else {
      // Production mode: Only create the single production administrator configured via environment
      insertUser.run(config.ADMIN_USERNAME, adminPasswordHash, config.ADMIN_NAME, 'Admin', 'All');
      console.log(`Production admin account initialized: username="${config.ADMIN_USERNAME}".`);
    }
  } else {
    // If users already exist and an explicit ADMIN_PASSWORD or ADMIN_USERNAME is supplied via env, sync it
    if (process.env.ADMIN_PASSWORD || process.env.ADMIN_USERNAME || process.env.ADMIN_USER) {
      const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(config.ADMIN_USERNAME);
      if (existingAdmin) {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(adminPasswordHash, existingAdmin.id);
        console.log(`Production admin "${config.ADMIN_USERNAME}" password updated from environment config.`);
      } else {
        insertUser.run(config.ADMIN_USERNAME, adminPasswordHash, config.ADMIN_NAME, 'Admin', 'All');
        console.log(`Production admin "${config.ADMIN_USERNAME}" created from environment config.`);
      }
    }
  }

  // Seed initial items if empty and demo data enabled
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  if (itemCount === 0 && config.SEED_DEMO_DATA) {
    const seedItems = [
      // Kitchen Items
      { name: 'Choice Ribeye Steak (12oz)', sku: 'KIT-BEEF-01', department: 'Kitchen', category: 'Meat & Poultry', current_stock: 12, unit: 'pieces', min_threshold: 20, cost_per_unit: 14.50, supplier: 'Cargill Meats', location: 'Walk-in Cooler 1' },
      { name: 'Atlantic Salmon Fillets', sku: 'KIT-FISH-02', department: 'Kitchen', category: 'Seafood', current_stock: 0, unit: 'kg', min_threshold: 8, cost_per_unit: 18.00, supplier: 'Ocean Harvest', location: 'Fish Station Fridge' },
      { name: 'Extra Virgin Olive Oil (5L)', sku: 'KIT-OIL-03', department: 'Kitchen', category: 'Dry Goods', current_stock: 24, unit: 'bottles', min_threshold: 10, cost_per_unit: 32.00, supplier: 'MedFoods Direct', location: 'Dry Storage Shelf A' },
      { name: 'Heavy Whipping Cream 36%', sku: 'KIT-DAIR-04', department: 'Kitchen', category: 'Dairy', current_stock: 6, unit: 'liters', min_threshold: 14, cost_per_unit: 4.80, supplier: 'Dairy Fresh', location: 'Dairy Walk-in' },
      { name: 'Fresh Mozzarella Ball 250g', sku: 'KIT-DAIR-05', department: 'Kitchen', category: 'Dairy', current_stock: 35, unit: 'packs', min_threshold: 15, cost_per_unit: 3.25, supplier: 'Dairy Fresh', location: 'Dairy Walk-in' },
      { name: 'San Marzano Canned Tomatoes', sku: 'KIT-CANN-06', department: 'Kitchen', category: 'Canned Goods', current_stock: 48, unit: 'cans', min_threshold: 24, cost_per_unit: 2.10, supplier: 'Sysco Distribution', location: 'Dry Storage Shelf B' },
      { name: 'Organic Yellow Onions (50lb)', sku: 'KIT-PROD-07', department: 'Kitchen', category: 'Produce', current_stock: 5, unit: 'sacks', min_threshold: 3, cost_per_unit: 22.00, supplier: 'Green Valley Produce', location: 'Vegetable Prep Cooler' },
      { name: 'Peeled Garlic Cloves (1kg)', sku: 'KIT-PROD-08', department: 'Kitchen', category: 'Produce', current_stock: 2, unit: 'kg', min_threshold: 6, cost_per_unit: 6.50, supplier: 'Green Valley Produce', location: 'Vegetable Prep Cooler' },
      { name: 'French Fries Cut 3/8" (30lb)', sku: 'KIT-FROZ-09', department: 'Kitchen', category: 'Frozen', current_stock: 15, unit: 'boxes', min_threshold: 6, cost_per_unit: 28.50, supplier: 'Lamb Weston', location: 'Deep Freezer Unit 2' },
      { name: 'Baker\'s Unbleached Flour (50lb)', sku: 'KIT-DRY-10', department: 'Kitchen', category: 'Dry Goods', current_stock: 0, unit: 'sacks', min_threshold: 5, cost_per_unit: 19.80, supplier: 'King Arthur Direct', location: 'Baking Station Shelf' },

      // Housekeeping Items
      { name: 'Commercial Disinfectant (Gallon)', sku: 'HK-CHEM-01', department: 'Housekeeping', category: 'Chemicals', current_stock: 8, unit: 'bottles', min_threshold: 4, cost_per_unit: 16.50, supplier: 'Ecolab', location: 'Chemical Storage Rm 101' },
      { name: 'Heavy Duty Bleach Clean 1Gal', sku: 'HK-CHEM-02', department: 'Housekeeping', category: 'Chemicals', current_stock: 2, unit: 'bottles', min_threshold: 8, cost_per_unit: 8.20, supplier: 'Ecolab', location: 'Chemical Storage Rm 101' },
      { name: 'Microfiber Cleaning Cloths (Pack 12)', sku: 'HK-EQUIP-03', department: 'Housekeeping', category: 'Cleaning Tools', current_stock: 45, unit: 'packs', min_threshold: 15, cost_per_unit: 11.00, supplier: 'Uline Supply', location: 'Linen Closet Floor 1' },
      { name: '55-Gallon Heavy Duty Can Liners', sku: 'HK-WASTE-04', department: 'Housekeeping', category: 'Waste & Paper', current_stock: 3, unit: 'rolls', min_threshold: 10, cost_per_unit: 24.00, supplier: 'Uline Supply', location: 'Supply Bay B' },
      { name: 'Automated Dishwasher Pods (150ct)', sku: 'HK-CHEM-05', department: 'Housekeeping', category: 'Chemicals', current_stock: 0, unit: 'tubs', min_threshold: 4, cost_per_unit: 38.00, supplier: 'Ecolab', location: 'Dish Pit Rack' },
      { name: 'Premium Plush Bath Towels (White)', sku: 'HK-LINEN-06', department: 'Housekeeping', category: 'Linens', current_stock: 60, unit: 'pieces', min_threshold: 30, cost_per_unit: 9.50, supplier: 'Standard Textile', location: 'Central Laundry Staging' },
      { name: 'Foam Hand Soap Anti-Bacterial Refill', sku: 'HK-AMEN-07', department: 'Housekeeping', category: 'Guest Amenities', current_stock: 14, unit: 'bottles', min_threshold: 6, cost_per_unit: 12.80, supplier: 'GOJO Industries', location: 'Supply Bay A' },
      { name: 'Heavy Duty Floor Degreaser (5Gal)', sku: 'HK-CHEM-08', department: 'Housekeeping', category: 'Chemicals', current_stock: 4, unit: 'buckets', min_threshold: 2, cost_per_unit: 45.00, supplier: 'Ecolab', location: 'Mop Room' },

      // Bar Items
      { name: 'Jameson Irish Whiskey 750ml', sku: 'BAR-SPIR-01', department: 'Bar', category: 'Spirits', current_stock: 14, unit: 'bottles', min_threshold: 6, cost_per_unit: 26.00, supplier: 'Southern Glazer\'s', location: 'Main Bar Back Room' },
      { name: 'Grey Goose Vodka 1.0L', sku: 'BAR-SPIR-02', department: 'Bar', category: 'Spirits', current_stock: 2, unit: 'bottles', min_threshold: 8, cost_per_unit: 36.50, supplier: 'Southern Glazer\'s', location: 'Speed Rail Shelf 1' },
      { name: 'Hendrick\'s Gin 750ml', sku: 'BAR-SPIR-03', department: 'Bar', category: 'Spirits', current_stock: 9, unit: 'bottles', min_threshold: 4, cost_per_unit: 34.00, supplier: 'RNDC Beverages', location: 'Main Bar Back Room' },
      { name: 'Don Julio Blanco Tequila 750ml', sku: 'BAR-SPIR-04', department: 'Bar', category: 'Spirits', current_stock: 0, unit: 'bottles', min_threshold: 5, cost_per_unit: 48.00, supplier: 'Southern Glazer\'s', location: 'Top Shelf Lockup' },
      { name: 'Napa Valley Cabernet Sauvignon 750ml', sku: 'BAR-WINE-05', department: 'Bar', category: 'Wines', current_stock: 22, unit: 'bottles', min_threshold: 12, cost_per_unit: 21.00, supplier: 'Empire Merchants', location: 'Wine Cellar Rack 2' },
      { name: 'Prosecco Superiore DOCG 750ml', sku: 'BAR-WINE-06', department: 'Bar', category: 'Sparkling Wine', current_stock: 18, unit: 'bottles', min_threshold: 12, cost_per_unit: 14.50, supplier: 'Empire Merchants', location: 'Walk-in Wine Cooler' },
      { name: 'Hazy IPA Half-Barrel Draft Keg', sku: 'BAR-BEER-07', department: 'Bar', category: 'Beer Draft', current_stock: 1, unit: 'kegs', min_threshold: 3, cost_per_unit: 140.00, supplier: 'Local Craft Dist', location: 'Keg Cooler Walk-in' },
      { name: 'Fever-Tree Premium Tonic (24-pk)', sku: 'BAR-MIX-08', department: 'Bar', category: 'Mixers', current_stock: 6, unit: 'boxes', min_threshold: 4, cost_per_unit: 24.00, supplier: 'Sysco Beverages', location: 'Dry Storage Shelf D' },
      { name: 'Fresh Cocktail Persian Limes (10lb)', sku: 'BAR-GARN-09', department: 'Bar', category: 'Garnishes & Fresh', current_stock: 0, unit: 'boxes', min_threshold: 2, cost_per_unit: 18.50, supplier: 'Green Valley Produce', location: 'Bar Fridge 2' },
      { name: 'Angostura Aromatic Bitters 200ml', sku: 'BAR-MIX-10', department: 'Bar', category: 'Bitters & Syrups', current_stock: 5, unit: 'bottles', min_threshold: 2, cost_per_unit: 11.50, supplier: 'Southern Glazer\'s', location: 'Prep Station Caddy' }
    ];

    const insertItem = db.prepare(`
      INSERT INTO items (name, sku, department, category, current_stock, unit, min_threshold, cost_per_unit, supplier, location, notes)
      VALUES (@name, @sku, @department, @category, @current_stock, @unit, @min_threshold, @cost_per_unit, @supplier, @location, @notes)
    `);

    const insertInitialTx = db.prepare(`
      INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes, created_at)
      VALUES (?, ?, ?, ?, 'INITIAL', ?, 0, ?, 'System Initializer', 'Initial Setup', 'System baseline import', datetime('now', '-3 days'))
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        const itemRecord = {
          ...item,
          notes: item.notes || `Standard stock for ${item.department}`
        };
        const info = insertItem.run(itemRecord);
        insertInitialTx.run(
          info.lastInsertRowid,
          item.name,
          item.sku,
          item.department,
          item.current_stock,
          item.current_stock
        );
      }
    });

    insertMany(seedItems);
    console.log('Sample inventory items seeded successfully.');

    // Seed some realistic recent transactions (Stock In & Stock Out)
    const recentTx = [
      {
        sku: 'KIT-BEEF-01',
        type: 'OUT',
        quantity: 8,
        prev: 20,
        curr: 12,
        user: 'Marco Rossi',
        dest: 'Dinner Service Grill Station',
        notes: 'Prepped for Friday night rush',
        timeOffset: '-2 days'
      },
      {
        sku: 'KIT-DAIR-04',
        type: 'OUT',
        quantity: 6,
        prev: 12,
        curr: 6,
        user: 'Marco Rossi',
        dest: 'Pastry & Sauce Station',
        notes: 'Sauce reduction batch and panna cotta',
        timeOffset: '-1 day'
      },
      {
        sku: 'BAR-SPIR-02',
        type: 'OUT',
        quantity: 4,
        prev: 6,
        curr: 2,
        user: 'Sarah Jenkins',
        dest: 'Patio Bar Station',
        notes: 'Restocked well bottles for event',
        timeOffset: '-18 hours'
      },
      {
        sku: 'KIT-CANN-06',
        type: 'IN',
        quantity: 24,
        prev: 24,
        curr: 48,
        user: 'Alex Vance',
        dest: 'Sysco Delivery PO-8841',
        notes: 'Weekly staples delivery verified and checked in',
        timeOffset: '-12 hours'
      },
      {
        sku: 'HK-CHEM-02',
        type: 'OUT',
        quantity: 4,
        prev: 6,
        curr: 2,
        user: 'Elena Rostova',
        dest: 'Deep Clean Restrooms Floor 2',
        notes: 'Scheduled sanitization protocol',
        timeOffset: '-8 hours'
      },
      {
        sku: 'BAR-BEER-07',
        type: 'OUT',
        quantity: 2,
        prev: 3,
        curr: 1,
        user: 'Sarah Jenkins',
        dest: 'Taps 4 & 5 Replacement',
        notes: 'Keg tapped during happy hour',
        timeOffset: '-3 hours'
      }
    ];

    const insertTxStmt = db.prepare(`
      INSERT INTO transactions (item_id, item_name, sku, department, type, quantity, previous_stock, new_stock, user_name, destination_or_source, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    for (const tx of recentTx) {
      const itm = db.prepare('SELECT id, name, department FROM items WHERE sku = ?').get(tx.sku);
      if (itm) {
        insertTxStmt.run(
          itm.id,
          itm.name,
          tx.sku,
          itm.department,
          tx.type,
          tx.quantity,
          tx.prev,
          tx.curr,
          tx.user,
          tx.dest,
          tx.notes,
          tx.timeOffset
        );
      }
    }
    console.log('Recent transactions seeded successfully.');
  }
}

initDb();

module.exports = db;
