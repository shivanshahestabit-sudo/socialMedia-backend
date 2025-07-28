import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      picturePath,
      friends,
      location,
      occupation,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({ msg: "All required fields must be filled." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ msg: "Email already registered." });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: passwordHash,
      picturePath,
      friends,
      location,
      occupation,
    });

    const savedUser = await newUser.save();
    const userResponse = { ...savedUser._doc };
    delete userResponse.password;

    return res.status(201).json({
      msg: "User registered successfully.",
      user: userResponse,
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res
      .status(500)
      .json({ msg: "Server error. Please try again later." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required." });
    }

    const user = await User.findOne({ email, provider: "local" });
    if (!user) {
      return res.status(401).json({ msg: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const userResponse = { ...user._doc };
    delete userResponse.password;
    delete userResponse.accessToken;
    delete userResponse.refreshToken;

    return res.status(200).json({
      msg: "Login successful.",
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res
      .status(500)
      .json({ msg: "Server error. Please try again later." });
  }
};


export const googleLogin = async (req, res) => {
  try {
    const { googleId, email, firstName, lastName, picturePath, emailVerified, accessToken } = req.googleUser;

    let user = await User.findOne({ 
      $or: [
        { googleId },
        { email, provider: 'google' }
      ] 
    });

    if (user) {
      user.accessToken = accessToken;
      user.tokenExpiry = new Date(Date.now() + 3600000);
      user.picturePath = picturePath;
      user.emailVerified = emailVerified;
      await user.save();
    } else {
      const existingUser = await User.findOne({ email, provider: 'local' });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          msg: "An account with this email already exists. Please sign in with your password or reset it."
        });
      }

      user = new User({
        googleId,
        email,
        firstName,
        lastName,
        picturePath,
        accessToken,
        tokenExpiry: new Date(Date.now() + 3600000),
        provider: 'google',
        emailVerified,
        friends: [],
        location: '',
        occupation: ''
      });
      await user.save();
    }

    const token = jwt.sign(
      { 
        id: user._id,
        provider: 'google'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = { ...user._doc };
    delete userResponse.password;
    delete userResponse.accessToken;
    delete userResponse.refreshToken;

    res.status(200).json({
      success: true,
      msg: user.isNew ? 'User registered successfully' : 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Internal server error during authentication' 
    });
  }
};
