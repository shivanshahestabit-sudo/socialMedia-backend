const request = require("supertest");
const mongoose = require("mongoose");
const { getApp } = require("../helpers/app-wrapper.cjs");
const { clearDatabase } = require("../setup/database.cjs");
const users = require("../fixtures/users.json");
const Notification = require("../../models/Notification");

let app;
let tokenMap = {};
let userId;

beforeAll(async () => {
  app = await getApp();
});

beforeEach(async () => {
  await clearDatabase();

  // Register and login users
  for (const user of users) {
    await request(app).post("/auth/register").send(user);
    if (user.password) {
      const loginRes = await request(app)
        .post("/auth/login")
        .send({ email: user.email, password: user.password });
      tokenMap[user.email] = loginRes.body.token;
      if (user.role === "user") userId = loginRes.body.user._id;
    }
  }

  // Create mock notifications
  await Notification.insertMany([
    { userId, message: "Test Notification 1", read: false },
    { userId, message: "Test Notification 2", read: false },
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Notification API", () => {
  const testUser = users.find((u) => u.role === "user");
  const token = () => tokenMap[testUser.email];

  test("GET /notifications/:userId - should fetch notifications", async () => {
    const res = await request(app)
      .get(`/notifications/${userId}`)
      .set("Authorization", `Bearer ${token()}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty("message");
  });

  test("PATCH /notifications/:id/read - should mark single notification as read", async () => {
    const [notification] = await Notification.find({ userId });

    const res = await request(app)
      .patch(`/notifications/${notification._id}/read`)
      .set("Authorization", `Bearer ${token()}`)
      .expect(200);

    expect(res.body.message).toMatch(/marked as read/i);

    const updated = await Notification.findById(notification._id);
    expect(updated.read).toBe(true);
  });

  test("PATCH /notifications/user/:userId/read-all - should mark all as read", async () => {
    const res = await request(app)
      .patch(`/notifications/user/${userId}/read-all`)
      .set("Authorization", `Bearer ${token()}`)
      .expect(200);

    expect(res.body.message).toMatch(/all notifications marked as read/i);

    const allRead = await Notification.find({ userId });
    allRead.forEach((n) => expect(n.read).toBe(true));
  });

  test("GET /notifications/:userId - should return 401 without token", async () => {
    await request(app)
      .get(`/notifications/${userId}`)
      .expect(401);
  });
});
