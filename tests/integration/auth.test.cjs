const request = require("supertest");
const mongoose = require("mongoose");
const { clearDatabase } = require("../setup/database.cjs");
const { getApp } = require("../helpers/app-wrapper.cjs");
const usersData = require("../fixtures/users.json");

let app;

beforeAll(async () => {
  app = await getApp();
});

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth Integration Tests for Multiple Users", () => {
  usersData.forEach((user) => {
    describe(`User: ${user.email}`, () => {
      describe("POST /auth/register", () => {
        test("should register a new user successfully", async () => {
          const response = await request(app)
            .post("/auth/register")
            .send(user)
            .expect(201);

          expect(response.body).toHaveProperty("user");
          expect(response.body.user.email).toBe(user.email);
          expect(response.body.user).not.toHaveProperty("password");
        });

        test("should return error for duplicate email", async () => {
          await request(app).post("/auth/register").send(user);

          const response = await request(app)
            .post("/auth/register")
            .send(user)
            .expect(409);

          expect(response.body.msg).toMatch(/already registered/i);
        });

        test("should return error for missing fields", async () => {
          const response = await request(app)
            .post("/auth/register")
            .send({ email: "missing@example.com", password: "12345678" })
            .expect(400);

          expect(response.body.msg).toMatch(/required/i);
        });
      });

      // Only run login tests for users with passwords (not OAuth users)
      if (user.password) {
        describe("POST /auth/login", () => {
          beforeEach(async () => {
            await request(app).post("/auth/register").send(user);
          });

          test("should login successfully with correct credentials", async () => {
            const response = await request(app)
              .post("/auth/login")
              .send({ email: user.email, password: user.password })
              .expect(200);

            expect(response.body).toHaveProperty("token");
            expect(response.body.user.email).toBe(user.email);
          });

          test("should fail login with incorrect password", async () => {
            const response = await request(app)
              .post("/auth/login")
              .send({ email: user.email, password: "wrongpassword" })
              .expect(401);

            expect(response.body.msg).toMatch(/invalid/i);
          });

          test("should return 400 if credentials are missing", async () => {
            const response = await request(app)
              .post("/auth/login")
              .send({ email: user.email }) // missing password
              .expect(400);

            expect(response.body.msg).toMatch(/required/i);
          });
        });
      }
    });
  });
});
