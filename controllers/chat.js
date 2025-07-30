const Chat = require("../models/Chat.js");
const User = require("../models/User.js");  


const getChatUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    const userIds = new Set();
    const lastMessages = new Map();

    chats.forEach((chat) => {
      const otherUserId = chat.senderId.toString() === userId 
        ? chat.receiverId.toString() 
        : chat.senderId.toString();
      
      if (!lastMessages.has(otherUserId)) {
        lastMessages.set(otherUserId, {
          content: chat.content,
          timestamp: chat.createdAt,
          isSender: chat.senderId.toString() === userId
        });
      }
      
      userIds.add(otherUserId);
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select(
      "_id firstName lastName picturePath"
    );

    const usersWithLastMessage = users.map(user => ({
      ...user._doc,
      lastMessage: lastMessages.get(user._id.toString()) || null
    }));

    usersWithLastMessage.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
    });

    res.status(200).json(usersWithLastMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    const messages = await Chat.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
    .populate('senderId', 'firstName lastName picturePath')
    .populate('receiverId', 'firstName lastName picturePath')
    .sort({ createdAt: 1 });

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: msg.content,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      isSender: msg.senderId._id.toString() === senderId,
    }));

    res.status(200).json(formattedMessages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body;

    const newMessage = new Chat({
      senderId,
      receiverId,
      content,
    });

    await newMessage.save();
    await newMessage.populate('senderId', 'firstName lastName picturePath');
    await newMessage.populate('receiverId', 'firstName lastName picturePath');

    const io = req.app.get('io');
    const userSockets = global.userSockets;
    
    const receiverSocketId = userSockets.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-message", {
        _id: newMessage._id,
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        content: newMessage.content,
        createdAt: newMessage.createdAt,
        updatedAt: newMessage.updatedAt,
        isSender: false,
      });
      
      io.to(receiverSocketId).emit("receive-notification", {
        type: "message",
        senderId: senderId,
        senderName: `${newMessage.senderId.firstName} ${newMessage.senderId.lastName}`,
        message: content.length > 50 ? content.substring(0, 50) + "..." : content,
        timestamp: new Date(),
      });
    }

    res.status(201).json({
      _id: newMessage._id,
      senderId: newMessage.senderId,
      receiverId: newMessage.receiverId,
      content: newMessage.content,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
      isSender: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const users = await User.find({ 
      _id: { $ne: currentUserId } 
    }).select("_id firstName lastName picturePath");
    
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getChatUsers,
  getMessages,
  sendMessage,
  getAllUsers,
};

