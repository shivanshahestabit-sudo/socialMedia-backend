const User = require("../models/User.js");
const Message = require("../models/Chat.js");
const cloudinary = require("../middleware/cloudinary.js");

const getUsersForChat = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;

    const users = await User.find({
      _id: { $ne: loggedInUserId },
      role: { $ne: "admin" },
    }).select("-password");

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
    });
  } catch (err) {
    console.error("Error fetching users for chat:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: err.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId, receiverId: userId },
        { senderId: userId, receiverId: loggedInUserId },
      ],
    })
      .populate("senderId", "firstName lastName picturePath")
      .populate("receiverId", "firstName lastName picturePath")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        senderId: userId,
        receiverId: loggedInUserId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    const formattedMessages = messages.map((message) => ({
      _id: message._id,
      senderId: message.senderId._id,
      receiverId: message.receiverId._id,
      content: message.content || message.text,
      text: message.content || message.text,
      image: message.image,
      messageType: message.messageType,
      isRead: message.isRead,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      isSender: message.senderId._id.toString() === loggedInUserId,
      sender: {
        _id: message.senderId._id,
        firstName: message.senderId.firstName,
        lastName: message.senderId.lastName,
        picturePath: message.senderId.picturePath,
      },
      receiver: {
        _id: message.receiverId._id,
        firstName: message.receiverId.firstName,
        lastName: message.receiverId.lastName,
        picturePath: message.receiverId.picturePath,
      },
    }));

    return res.status(200).json(formattedMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve messages",
      error: err.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, text } = req.body;
    const senderId = req.user.id;
    let imageUrl = null;
    let messageType = "text";

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID is required",
      });
    }

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "chat_images",
          resource_type: "image",
        });
        imageUrl = result.secure_url;
        messageType = content || text ? "mixed" : "image";
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          error: uploadError.message,
        });
      }
    }

    if (req.body.imageData && !req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.body.imageData, {
          folder: "chat_images",
          resource_type: "image",
        });
        imageUrl = result.secure_url;
        messageType = content || text ? "mixed" : "image";
      } catch (uploadError) {
        console.error("Base64 image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          error: uploadError.message,
        });
      }
    }

    const messageContent = content || text || "";
    if (!messageContent && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Message content or image is required",
      });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      content: messageContent,
      text: messageContent,
      image: imageUrl,
      messageType,
    });

    const savedMessage = await newMessage.save();

    await savedMessage.populate("senderId", "firstName lastName picturePath");
    await savedMessage.populate("receiverId", "firstName lastName picturePath");

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
      isSender: true,
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

    if (global.io && global.userSockets) {
      const receiverSocketId = global.userSockets.get(receiverId);

      if (receiverSocketId) {
        global.io.to(receiverSocketId).emit("receive-message", {
          ...messageData,
          isSender: false,
        });

        const notificationData = {
          type: "message",
          senderId,
          senderName: `${savedMessage.senderId.firstName} ${savedMessage.senderId.lastName}`,
          message:
            messageContent.length > 50
              ? messageContent.slice(0, 50) + "..."
              : messageContent || "Sent an image",
          timestamp: new Date(),
        };

        global.io
          .to(receiverSocketId)
          .emit("receive-notification", notificationData);
      }

      const senderSocketId = global.userSockets.get(senderId);
      if (senderSocketId) {
        global.io.to(senderSocketId).emit("message-sent", messageData);
      }
    }

    return res.status(201).json(messageData);
  } catch (err) {
    console.error("Error sending message:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: err.message,
    });
  }
};

const getUnreadMessagesCount = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;

    const unreadCount = await Message.countDocuments({
      receiverId: loggedInUserId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (err) {
    console.error("Error getting unread messages count:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get unread messages count",
      error: err.message,
    });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverId = req.user.id;

    await Message.updateMany(
      {
        senderId,
        receiverId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: err.message,
    });
  }
};

const getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = global.userSockets
      ? Array.from(global.userSockets.keys())
      : [];

    return res.status(200).json({
      success: true,
      onlineUsers,
    });
  } catch (err) {
    console.error("Error getting online users:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get online users",
      error: err.message,
    });
  }
};

module.exports = {
  getUsersForChat,
  getMessages,
  sendMessage,
  getUnreadMessagesCount,
  markMessagesAsRead,
  getOnlineUsers,
};
