import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      min: 2,
      max: 50,
    },
    lastName: {
      type: String,
      required: true,
      min: 2,
      max: 50,
    },
    email: {
      type: String,
      required: true,
      max: 50,
      unique: true,
    },
    password: {
      type: String,
      required: function() {
        return this.provider === 'local';
      },
      min: 5,
    },
    picturePath: {
      type: String,
      default: "",
    },
    friends: {
      type: Array,
      default: [],
    },
    location: String,
    occupation: String,
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    accessToken: {
      type: String
    },
    refreshToken: {
      type: String
    },
    tokenExpiry: {
      type: Date
    },
    emailVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

UserSchema.index({ googleId: 1 });
UserSchema.index({ email: 1, provider: 1 });

const User = mongoose.model("User", UserSchema);
export default User;
