const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');
const config = require('./config');

const dbPath = path.join(__dirname, 'inventory.db');
const db = new Database(dbPath);

const args = process.argv.slice(2);
const isClean = args.includes('--clean') || args.includes('-c');
const isResetSample = args.includes('--sample') || args.includes('-s');

function clearData(keepUsers = false) {
  console.log('Clearing inventory database...');
  db.pragma('foreign_keys = OFF');
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM items;
    DELETE FROM sqlite_sequence WHERE name IN ('items', 'transactions');
  `);

  if (!keepUsers) {
    db.exec(`
      DELETE FROM users;
      DELETE FROM sqlite_sequence WHERE name = 'users';
    `);
  }
  db.pragma('foreign_keys = ON');
  console.log('Inventory and transaction history cleared.');
}

function createProductionAdmin(username = 'admin', password = 'adminpassword', name = 'Restaurant Manager') {
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, department)
    VALUES (?, ?, ?, 'Admin', 'All')
  `);
  stmt.run(username, hash, name);
  console.log(`\nCreated Production Administrator:`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role: Admin (All Departments)\n`);
}

if (isClean) {
  clearData(false);
  // Create production admin account configured in environment/config
  createProductionAdmin(config.ADMIN_USERNAME, config.ADMIN_PASSWORD, config.ADMIN_NAME);
  console.log('Ready for production! You can now import your real inventory via Excel or the UI.');
  process.exit(0);
} else if (isResetSample) {
  // Re-seed sample data
  clearData(false);
  require('./db');
  console.log('Database re-seeded with demo sample items and accounts.');
  process.exit(0);
} else {
  console.log(`
Usage:
  node server/resetDb.js --clean     # Wipe sample items/transactions, create clean admin
  node server/resetDb.js --sample    # Reset database with demo restaurant sample data
`);
  process.exit(0);
}
