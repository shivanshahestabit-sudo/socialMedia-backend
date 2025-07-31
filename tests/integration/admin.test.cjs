const request = require("supertest");
const mongoose = require("mongoose");
const { clearDatabase } = require("../setup/database.cjs");
const { getApp } = require("../helpers/app-wrapper.cjs");
const usersData = require("../fixtures/users.json");

let app;

let tokens = {};

beforeAll(async () => {
  app = await getApp();
});

beforeEach(async () => {
  await clearDatabase();

  // Register all users and store their tokens
  for (const user of usersData) {
    await request(app).post("/auth/register").send(user);

    if (user.password) {
      const loginRes = await request(app)
        .post("/auth/login")
        .send({ email: user.email, password: user.password });

      tokens[user.email] = loginRes.body.token;
    }
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("GET /admin/users - Admin-only access", () => {
  const adminUser = usersData.find((u) => u.role === "admin");
  const normalUser = usersData.find((u) => u.role === "user" && u.password);

  test("should return all non-admin users for admin", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${tokens[adminUser.email]}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users.every((u) => u.role !== "admin")).toBe(true);
    expect(res.body).toHaveProperty("count");
    expect(res.body).toHaveProperty("totalPages");
  });

  test("should deny access for non-admin users", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${tokens[normalUser.email]}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access denied/i);
  });

  test("should return 404 if user not found (invalid token)", async () => {
    const invalidToken =
      tokens[adminUser.email].split(".").slice(0, 2).join(".") + ".invalidsig";

    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${invalidToken}`)
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  test("should return 401 if no token provided", async () => {
    const res = await request(app).get("/admin/users").expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access denied/i);
  });
});
