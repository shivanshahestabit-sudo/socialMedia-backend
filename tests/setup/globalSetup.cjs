const { setupDatabase } = require('./database.cjs');

module.exports = async function globalSetup() {
  console.log('Setting up test database...');
  await setupDatabase();
};