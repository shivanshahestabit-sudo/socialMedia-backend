const PostData = require("../models/Post.js");
const User = require("../models/User.js");
const Notification = require("../models/Notification.js");

const createPost = async (req, res) => {
  try {
    const { userId, description, picturePath } = req.body;
    const user = await User.findById(userId);
    const newPost = new PostData({
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      location: user.location,
      description,
      userPicturePath: user.picturePath,
      picturePath,
      likes: {},
      comments: [],
    });
    await newPost.save();

    const allUsers = await User.find({ _id: { $ne: userId } });

    const notifications = allUsers.map((user) => ({
      userId: user._id,
      type: "new_post",
      message: `${newPost.firstName} ${newPost.lastName} created a new post`,
      fromUser: userId,
      fromUserName: `${newPost.firstName} ${newPost.lastName}`,
      postId: newPost._id,
    }));

    await Notification.insertMany(notifications);

    const io = global.io;
    const userSockets = global.userSockets;

    allUsers.forEach((user) => {
      const socketId = userSockets.get(user._id.toString());
      if (socketId) {
        io.to(socketId).emit("new_notification", {
          type: "new_post",
          message: `${newPost.firstName} ${newPost.lastName} created a new post`,
          postId: newPost._id,
          fromUser: userId,
          fromUserName: `${newPost.firstName} ${newPost.lastName}`,
          createdAt: new Date(),
        });
      }
    });

    const posts = await PostData.find().sort({ createdAt: -1 });
    res.status(201).json(posts);
  } catch (err) {
    res.status(409).json({ message: err.message });
  }
};

const getFeedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "newest";
    const skip = (page - 1) * limit;

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const totalPosts = await PostData.countDocuments();
    const posts = await PostData.find()
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      posts,
      totalPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "newest";
    const skip = (page - 1) * limit;

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const totalPosts = await PostData.countDocuments({ userId });
    const posts = await PostData.find({ userId })
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      posts,
      totalPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
    });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const post = await PostData.findById(id);
    const isLiked = post.likes.get(userId);

    if (isLiked) {
      post.likes.delete(userId);
    } else {
      post.likes.set(userId, true);

      if (post.userId !== userId) {
        const user = await User.findById(userId);
        const notification = new Notification({
          userId: post.userId,
          type: "post_like",
          message: `${user.firstName} ${user.lastName} liked your post`,
          fromUser: userId,
          fromUserName: `${user.firstName} ${user.lastName}`,
          postId: id,
        });

        await notification.save();

        const io = global.io;
        const userSockets = global.userSockets;
        const socketId = userSockets.get(post.userId);

        if (socketId) {
          io.to(socketId).emit("new_notification", {
            type: "post_like",
            message: `${user.firstName} ${user.lastName} liked your post`,
            postId: id,
            fromUser: userId,
            fromUserName: `${user.firstName} ${user.lastName}`,
            createdAt: new Date(),
          });
        }
      }
    }

    const updatedPost = await PostData.findByIdAndUpdate(
      id,
      { likes: post.likes },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, comment } = req.body;

    const user = await User.findById(userId);
    const post = await PostData.findById(id);

    const newComment = {
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      comment,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    if (post.userId !== userId) {
      const notification = new Notification({
        userId: post.userId,
        type: "new_comment",
        message: `${user.firstName} ${user.lastName} commented on your post`,
        fromUser: userId,
        fromUserName: `${user.firstName} ${user.lastName}`,
        postId: id,
      });

      await notification.save();

      const io = global.io;
      const userSockets = global.userSockets;
      const socketId = userSockets.get(post.userId);

      if (socketId) {
        io.to(socketId).emit("new_notification", {
          type: "new_comment",
          message: `${user.firstName} ${user.lastName} commented on your post`,
          postId: id,
          fromUser: userId,
          fromUserName: `${user.firstName} ${user.lastName}`,
          createdAt: new Date(),
        });
      }
    }

    const updatedPost = await PostData.findById(id);
    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const post = await PostData.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ message: "You can only delete your own posts" });
    }

    await PostData.findByIdAndDelete(id);

    await Notification.deleteMany({ postId: id });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const editPost = async (req, res) => {
  try {
    const { userId, postId } = req.params;
    const { description, picturePath } = req.body;

    const post = await PostData.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to edit this post" });
    }

    if (description !== undefined) post.description = description;
    if (picturePath !== undefined) post.picturePath = picturePath;

    await post.save();

    res.status(200).json({ message: "Post updated successfully", post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createPost,
  getFeedPosts,
  getUserPosts,
  likePost,
  addComment,
  deletePost,
  editPost,
};