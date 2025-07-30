const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

// Setup function
const setupDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

// Teardown function
const teardownDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

// Clear database function
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;

  const db = mongoose.connection;
  if (db.readyState !== 1) {
    throw new Error("MongoDB not connected");
  }
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

module.exports = {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
};
