import User from "../models/User.js";

export const getAllUsers = async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const requestingUser = await User.findById(requestingUserId);

    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (requestingUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const users = await User.find(
      { role: { $ne: "admin" } },
      {
        password: 0,
        accessToken: 0,
        refreshToken: 0,
        googleId: 0,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    const userCount = await User.countDocuments({ role: { $ne: "admin" } });

    const usersWithStatus = users.map((user) => ({
      ...user,
      isActive:
        user.emailVerified &&
        (!user.tokenExpiry || user.tokenExpiry > new Date()),
    }));

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users: usersWithStatus,
      count: userCount,
      totalPages: Math.ceil(userCount / 10),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
