const bcrypt = require("bcryptjs");
const User = require("../models/Users.model");
const jwt = require("jsonwebtoken");

const changePassword = async ({ userId, oldPassword, newPassword }) => {
  try {
    if (!userId || !oldPassword || !newPassword) {
      throw new Error("Missing required fields");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error("Old password is incorrect");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return true; 
    
  } catch (error) {
    throw new Error(error.message || "Change password failed");
  }
};

const resetPassword = async ({ userId, newPassword }) => {
  try {
    if (!userId || !newPassword) {
      throw new Error("Missing required fields");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return true;
  } catch (error) {
    throw new Error(error.message || "Reset password failed");
  }
};

module.exports = {
  changePassword,
  resetPassword
};
