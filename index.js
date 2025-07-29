import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { createServer } from "http";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import adminRoutes from "./routes/admin.js";
import notificationRoutes from "./routes/notifications.js";
import chatRoutes from "./routes/chat.js";
import { register } from "./controllers/auth.js";
import { createPost } from "./controllers/posts.js";
import { verifyToken } from "./middleware/auth.js";
import Chat from "./models/Chat.js";

const ENVIRONMENT = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${ENVIRONMENT}` });

console.log(`Running in ${ENVIRONMENT} mode`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
    console.log(`User ${userId} joined with socket ${socket.id}`);

    socket.join(`user_${userId}`);
  });

  socket.on("send-message", async (data) => {
    try {
      const { senderId, receiverId, content } = data;

      const newMessage = new Chat({
        senderId,
        receiverId,
        content,
      });

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
        senderId: senderId,
        senderName: `${newMessage.senderId.firstName} ${newMessage.senderId.lastName}`,
        message:
          content.length > 50 ? content.substring(0, 50) + "..." : content,
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

  socket.on("typing", (data) => {
    const { receiverId, isTyping } = data;
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
      console.log(`Notification sent to ${receiverId}`);
    } else {
      console.log(`User ${receiverId} not connected`);
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

app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use("/assets", express.static(path.join(__dirname, "public/assets")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/assets");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

app.post("/auth/register", upload.single("picture"), register);
app.post("/posts", verifyToken, upload.single("picture"), createPost);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/notifications", notificationRoutes);
app.use("/chat", chatRoutes);
app.use("/admin", adminRoutes);

const PORT = process.env.PORT || 6001;

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    server.listen(PORT, () => console.log(`Server Port: ${PORT}`));
  })
  .catch((error) => console.log(`${error} did not connect`));
