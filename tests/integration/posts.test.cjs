const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../../app.js");
const User = require("../../models/User.js");
const Post = require("../../models/Post.js");
const Notification = require("../../models/Notification.js");
const jwt = require("jsonwebtoken");

let mongoServer;
let user1Token, user2Token;
let user1Id, user2Id;
let user2PostId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create User1
  const user1 = new User({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "hashedPassword",
    location: "New York",
    picturePath: "john.jpg",
    provider: "local",
  });
  await user1.save();
  user1Id = user1._id.toString();
  user1Token = jwt.sign(
    { id: user1Id },
    process.env.JWT_SECRET || "testsecret"
  );

  // Create User2
  const user2 = new User({
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    password: "hashedPassword",
    location: "SF",
    picturePath: "jane.jpg",
    provider: "local",
  });
  await user2.save();
  user2Id = user2._id.toString();
  user2Token = jwt.sign(
    { id: user2Id },
    process.env.JWT_SECRET || "testsecret"
  );

  // Create a post by User2
  const res = await request(app)
    .post("/posts")
    .set("Authorization", `Bearer ${user2Token}`)
    .send({
      userId: user2Id,
      description: "User2's post",
      picturePath: "post.jpg",
    });

  console.log("POST creation response:", res.body);

  user2PostId = res.body._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Post API", () => {
  it("should not notify when user2 likes their own post", async () => {
    await Notification.deleteMany({}); // clear existing notifs

    const res = await request(app)
      .patch(`/posts/${user2PostId}/like`)
      .set("Authorization", `Bearer ${user2Token}`)
      .send({ userId: user2Id });

    expect(res.statusCode).toBe(200);
    const notifs = await Notification.find({ userId: user2Id });
    expect(notifs.length).toBe(0);
  });

  it("should notify user2 when user1 likes user2's post", async () => {
    await Notification.deleteMany({});

    const res = await request(app)
      .patch(`/posts/${user2PostId}/like`)
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ userId: user1Id });

    expect(res.statusCode).toBe(200);

    const notifs = await Notification.find({ userId: user2Id });
    expect(notifs.length).toBe(1);
    expect(notifs[0].type).toBe("post_like");
  });

  it("should not notify when user2 comments on their own post", async () => {
    await Notification.deleteMany({});

    const res = await request(app)
      .post(`/posts/${user2PostId}/comment`)
      .set("Authorization", `Bearer ${user2Token}`)
      .send({ userId: user2Id, comment: "My own comment" });

    expect(res.statusCode).toBe(200);

    const notifs = await Notification.find({ userId: user2Id });
    expect(notifs.length).toBe(0);
  });

  it("should notify user2 when user1 comments on user2's post", async () => {
    await Notification.deleteMany({});

    const res = await request(app)
      .post(`/posts/${user2PostId}/comment`)
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ userId: user1Id, comment: "Nice post Jane!" });

    expect(res.statusCode).toBe(200);

    const notifs = await Notification.find({ userId: user2Id });
    expect(notifs.length).toBe(1);
    expect(notifs[0].type).toBe("new_comment");
  });
});
