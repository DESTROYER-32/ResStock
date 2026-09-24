const bcrypt = require('bcryptjs');
const config = require('./config');
const { db, ensureDbInit, seedDemoData } = require('./db');

const args = process.argv.slice(2);
const isClean = args.includes('--clean') || args.includes('-c');
const isResetSample = args.includes('--sample') || args.includes('-s');

async function clearData(keepUsers = false) {
  console.log('Clearing inventory database...');
  await db.pragma('foreign_keys = OFF');
  await db.exec(`
    DELETE FROM transactions;
    DELETE FROM items;
    DELETE FROM sqlite_sequence WHERE name IN ('items', 'transactions');
  `);

  if (!keepUsers) {
    await db.exec(`
      DELETE FROM users;
      DELETE FROM sqlite_sequence WHERE name = 'users';
    `);
  }
  await db.pragma('foreign_keys = ON');
  console.log('Inventory and transaction history cleared.');
}

async function createProductionAdmin(username = 'admin', password = 'adminpassword', name = 'Restaurant Manager') {
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, department)
    VALUES (?, ?, ?, 'Admin', 'All')
  `);
  await stmt.run(username, hash, name);
  console.log(`\nCreated Production Administrator:`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role: Admin (All Departments)\n`);
}

async function main() {
  await ensureDbInit();

  if (isClean) {
    await clearData(false);
    await createProductionAdmin(config.ADMIN_USERNAME, config.ADMIN_PASSWORD, config.ADMIN_NAME);
    console.log('Ready for production! You can now import your real inventory via Excel or the UI.');
    process.exit(0);
  } else if (isResetSample) {
    await clearData(false);
    await seedDemoData();
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
}

main().catch((err) => {
  console.error('Reset database failed:', err);
  process.exit(1);
});
