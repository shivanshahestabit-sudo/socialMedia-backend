const mongoose = require("mongoose");
const app = require("../../app.js");

let isConnected = false;

async function getApp() {
  if (!isConnected) {
    await mongoose.connect(
      process.env.MONGO_URL ||
        `mongodb+srv://shivanshahestabit:oRjXNmd82m0VhbAL@personalworkspace.ho82eb5.mongodb.net/testingapp?retryWrites=true&w=majority&appName=PersonalWorkspace
`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    isConnected = true;
  }
  return app;
}

module.exports = { getApp };
