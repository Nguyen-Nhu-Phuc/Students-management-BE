// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/Users.model");
const TokenBlacklist = require("../models/TokenBlacklist.model");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";

// Middleware xác thực token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: "Access token missing" });
    }

    try {
        // Kiểm tra token có trong blacklist không
        const blacklistedToken = await TokenBlacklist.findOne({ token });
        if (blacklistedToken) {
            return res.status(401).json({ message: "Token has been revoked. Please login again." });
        }

        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        req.user = decoded; // { id, username, role }

        // Lấy thêm user từ DB (nếu cần)
        req.currentUser = await User.findById(decoded.id).select("-password");

        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};

// Middleware phân quyền
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: insufficient role" });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRoles };
