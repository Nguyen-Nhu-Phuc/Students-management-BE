// controllers/UserController.js
const { register, login, refreshAccessToken, logout, getOneUserService } = require("../services/Users.services");

const { changePassword, resetPassword } = require("../services/Auth.service")

const registerUser = async (req, res) => {
    try {
        const { username, password, role, profileData } = req.body;
        const { user, accessToken, refreshToken } = await register({
            username,
            password,
            role,
            profileData,
        });

        res.status(201).json({
            message: "Register success",
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                linkedId: user.linkedId,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const { user, accessToken, refreshToken } = await login({ username, password });

        res.status(200).json({
            message: "Login success",
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                linkedId: user.linkedId,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const refreshTokenController = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const { accessToken } = await refreshAccessToken(refreshToken);

        res.status(200).json({
            message: "New access token generated",
            accessToken,
        });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

const getOneUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await getOneUserService(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

const handleChangePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user?.id;

        if (!userId || !oldPassword || !newPassword) {
            console.warn("Missing fields:", { userId, oldPassword, newPassword });
            return res.status(400).json({ message: "Missing required fields" });
        }

        await changePassword({ userId, oldPassword, newPassword });

        return res.status(200).json({ message: "Password changed successfully" });

    } catch (error) {

        if (error.message === "User not found") {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === "Old password is incorrect") {
            return res.status(401).json({ message: error.message });
        }

        return res.status(500).json({ message: "Internal server error" });
    }
};

const handleResetPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const role = req.user?.role;

        if (role !== "admin") {
            return res.status(403).json({ message: "Only admin can reset password" });
        }

        if (!userId || !newPassword) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        await resetPassword({ userId, newPassword });

        return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Reset password error:", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json({ message: "Internal server error" });
    }
};

const logoutUser = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const authHeader = req.headers.authorization;
        const accessToken = authHeader && authHeader.split(" ")[1];

        const result = await logout(userId, accessToken);

        return res.status(200).json({
            message: result.message,
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ message: error.message || "Logout failed" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    refreshTokenController,
    handleChangePassword,
    handleResetPassword,
    logoutUser,
    getOneUser
};