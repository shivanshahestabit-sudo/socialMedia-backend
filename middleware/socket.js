let userSockets = new Map();
let io = null;

const setSocketIO = (socketIO) => {
  io = socketIO;
};

const setUserSockets = (sockets) => {
  userSockets = sockets;
};

const getUserSockets = () => userSockets;

const getReceiverSocketId = (receiverId) => {
  return userSockets.get(receiverId);
};

const getOnlineUsers = () => {
  return Array.from(userSockets.keys());
};

const isUserOnline = (userId) => {
  return userSockets.has(userId);
};

const emitToUser = (userId, event, data) => {
  const socketId = userSockets.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const emitOnlineUsers = () => {
  const onlineUsers = getOnlineUsers();
  if (io) {
    io.emit("users-online", onlineUsers);
  }
};

module.exports = {
  setSocketIO,
  setUserSockets,
  getUserSockets,
  getReceiverSocketId,
  getOnlineUsers,
  isUserOnline,
  emitToUser,
  emitToAll,
  emitOnlineUsers,
};
