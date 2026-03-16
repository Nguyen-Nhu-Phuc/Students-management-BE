// utils/jwt.js
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret";


const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            username: user.username,
            linkedId: user.linkedId,
        },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "10d" }
    );
};


const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            username: user.username,
        },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};
