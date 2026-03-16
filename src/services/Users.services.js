// services/UserService.js
const bcrypt = require("bcryptjs");
const User = require("../models/Users.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const TokenBlacklist = require("../models/TokenBlacklist.model");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const jwt = require("jsonwebtoken");

// Đăng ký
const register = async ({ username, password, role, profileData }) => {
    if (!["admin", "student", "teacher"].includes(role)) {
        throw new Error("Invalid role");
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
        throw new Error("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let linkedDoc = null;
    let roleRef = null;

    if (role === "student") {
        linkedDoc = await Student.create(profileData);
        roleRef = "Student";
    }

    if (role === "teacher") {
        linkedDoc = await Teacher.create(profileData);
        roleRef = "Teacher";
    }

    if (role === "admin") {
        roleRef = null;
    }

    const newUser = await User.create({
        username,
        password: hashedPassword,
        role,
        roleRef,
        linkedId: linkedDoc?._id || null,
    });

    // Tạo token
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Lưu refreshToken vào DB
    newUser.refreshToken = refreshToken;
    await newUser.save();

    return { user: newUser, accessToken, refreshToken };
};

// Đăng nhập
const login = async ({ username, password }) => {
    const user = await User.findOne({ username });
    if (!user) {
        throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid password");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    return { user, accessToken, refreshToken };
};

// Refresh token
const refreshAccessToken = async (refreshToken) => {
    const user = await User.findOne({ refreshToken });
    if (!user) {
        throw new Error("Invalid refresh token");
    }

    try {
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET || "refresh_secret"
        );
        const accessToken = generateAccessToken(user);
        return { accessToken };
    } catch (err) {
        throw new Error("Refresh token expired or invalid");
    }
};

// Đăng xuất
const logout = async (userId, accessToken) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        user.refreshToken = null;
        await user.save();

        // Thêm access token vào blacklist
        if (accessToken) {
            // Decode token để lấy expiration time
            const decoded = jwt.decode(accessToken);
            const expiresAt = new Date(decoded.exp * 1000); // Convert từ seconds sang milliseconds

            await TokenBlacklist.create({
                token: accessToken,
                userId: userId,
                expiresAt: expiresAt,
            });
        }

        return { message: "Logout successful" };
    } catch (err) {
        throw new Error(err.message || "Logout failed");
    }
};


const getOneUserService = async (userId) => {
    try {
        const user = await User.findById(userId).select("-password -refreshToken").populate("linkedId");
        return user;
    }

    catch (err) {
        throw new Error(err.message || "Get user failed");
    }

}

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout,
    getOneUserService
};
