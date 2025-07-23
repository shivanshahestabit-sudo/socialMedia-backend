import Notification from "../models/Notification.js";

export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.status(200).json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
