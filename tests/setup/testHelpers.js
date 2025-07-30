const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Create test user
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    ...userData
  };
  
  const user = new User(defaultUser);
  await user.save();
  return user;
};

// Create admin user
const createAdminUser = async (userData = {}) => {
  const adminData = {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    ...userData
  };
  
  return await createTestUser(adminData);
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

// Create authenticated headers
const createAuthHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  createTestUser,
  createAdminUser,
  generateToken,
  createAuthHeaders,
  wait
};