const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { createServer } = require("http");
const dotenv = require("dotenv");
const app = require("./app.js");
const Message = require("./models/Chat.js");
const User = require("./models/User.js");

dotenv.config();

mongoose.set("strictQuery", false);

const PORT = process.env.PORT || 3001;
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

const userSockets = new Map();
global.userSockets = userSockets;
global.io = io;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("error", { message: "Invalid user ID" });
        return;
      }

      for (const [uid, sid] of userSockets.entries()) {
        if (uid === userId && sid !== socket.id) {
          userSockets.delete(uid);
          break;
        }
      }

      userSockets.set(userId, socket.id);
      socket.userId = userId;
      socket.join(`user_${userId}`);

      console.log(
        `User ${userId} (${user.firstName} ${user.lastName}) joined with socket ${socket.id}`
      );

      const onlineUsers = Array.from(userSockets.keys());
      io.emit("users-online", onlineUsers);

      socket.emit("joined", {
        userId,
        message: "Successfully joined chat",
        onlineUsers,
      });
    } catch (error) {
      console.error("Error in join event:", error);
      socket.emit("error", { message: "Failed to join chat" });
    }
  });

  socket.on("send-message", async (data) => {
    try {
      const { senderId, receiverId, content, text, image } = data;

      if (!senderId || !receiverId) {
        socket.emit("message-error", {
          error: "Sender and receiver IDs are required",
        });
        return;
      }

      if (!content && !text && !image) {
        socket.emit("message-error", { error: "Message content is required" });
        return;
      }

      let messageType = "text";
      if (image && (content || text)) {
        messageType = "mixed";
      } else if (image) {
        messageType = "image";
      }

      const newMessage = new Message({
        senderId,
        receiverId,
        content: content || text || "",
        text: content || text || "",
        image: image || null,
        messageType,
      });

      const savedMessage = await newMessage.save();

      await savedMessage.populate("senderId", "firstName lastName picturePath");
      await savedMessage.populate(
        "receiverId",
        "firstName lastName picturePath"
      );

      const messageData = {
        _id: savedMessage._id,
        senderId: savedMessage.senderId._id,
        receiverId: savedMessage.receiverId._id,
        content: savedMessage.content,
        text: savedMessage.content,
        image: savedMessage.image,
        messageType: savedMessage.messageType,
        isRead: savedMessage.isRead,
        createdAt: savedMessage.createdAt,
        updatedAt: savedMessage.updatedAt,
        sender: {
          _id: savedMessage.senderId._id,
          firstName: savedMessage.senderId.firstName,
          lastName: savedMessage.senderId.lastName,
          picturePath: savedMessage.senderId.picturePath,
        },
        receiver: {
          _id: savedMessage.receiverId._id,
          firstName: savedMessage.receiverId.firstName,
          lastName: savedMessage.receiverId.lastName,
          picturePath: savedMessage.receiverId.picturePath,
        },
      };

      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", {
          ...messageData,
          isSender: false,
        });

        const notificationData = {
          type: "message",
          senderId,
          senderName: `${savedMessage.senderId.firstName} ${savedMessage.senderId.lastName}`,
          message:
            (content || text)?.length > 50
              ? (content || text).slice(0, 50) + "..."
              : content || text || "Sent an image",
          timestamp: new Date(),
        };

        io.to(receiverSocketId).emit("receive-notification", notificationData);
      }

      socket.emit("message-sent", {
        ...messageData,
        isSender: true,
      });

      console.log(`Message sent from ${senderId} to ${receiverId}`);
    } catch (error) {
      console.error("Error sending message via socket:", error);
      socket.emit("message-error", { error: "Failed to send message" });
    }
  });

  socket.on("typing", ({ receiverId, isTyping }) => {
    if (!socket.userId) return;

    const receiverSocketId = userSockets.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-typing", {
        senderId: socket.userId,
        isTyping,
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);

      const onlineUsers = Array.from(userSockets.keys());
      io.emit("users-online", onlineUsers);
    }
  });
});

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server ready at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
