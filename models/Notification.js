const mongoose = require("mongoose"); 

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['new_post', 'new_comment', 'post_like'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    fromUser: {
      type: String,
      required: true,
    },
    fromUserName: {
      type: String,
      required: true,
    },
    postId: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
