const { teardownDatabase } = require('./database.cjs');

module.exports = async function globalTeardown() {
  console.log('Tearing down test database...');
  await teardownDatabase();
};