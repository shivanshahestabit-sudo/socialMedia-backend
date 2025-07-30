const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { createServer } = require("http");
const dotenv = require("dotenv");
const app = require("./app.js");
const Chat = require("./models/Chat.js");

dotenv.config();

const PORT = process.env.PORT || 5001;
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  socket.on("send-message", async ({ senderId, receiverId, content }) => {
    try {
      const newMessage = new Chat({ senderId, receiverId, content });
      await newMessage.save();
      await newMessage.populate("senderId", "firstName lastName picturePath");

      const messageData = {
        _id: newMessage._id,
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        content: newMessage.content,
        createdAt: newMessage.createdAt,
        updatedAt: newMessage.updatedAt,
      };

      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", {
          ...messageData,
          isSender: false,
        });
      }

      socket.emit("message-sent", {
        ...messageData,
        isSender: true,
      });

      const notificationData = {
        type: "message",
        senderId,
        senderName: `${newMessage.senderId.firstName} ${newMessage.senderId.lastName}`,
        message: content.length > 50 ? content.slice(0, 50) + "..." : content,
        timestamp: new Date(),
      };

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-notification", notificationData);
      }

      console.log(`Message sent from ${senderId} to ${receiverId}`);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("message-error", { error: "Failed to send message" });
    }
  });

  socket.on("typing", ({ receiverId, isTyping }) => {
    const receiverSocketId = userSockets.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-typing", {
        senderId: socket.userId,
        isTyping,
      });
    }
  });

  socket.on("send-notification", ({ receiverId, notification }) => {
    const receiverSocketId = userSockets.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-notification", notification);
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

global.userSockets = userSockets;
global.io = io;

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    server.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
