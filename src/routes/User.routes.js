// routes/userRoutes.js
const express = require("express");
const {
    registerUser,
    loginUser,
    refreshTokenController,
    logoutUser,
    getOneUser
} = require("../controllers/User.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// ✅ Chỉ admin mới được đăng ký tài khoản
router.post("/register", verifyToken, authorizeRoles("admin"), registerUser);
router.get("/:id", verifyToken, getOneUser);
router.post("/register-admin", registerUser);

// Login & refresh không cần token
router.post("/login", loginUser);
router.post("/refresh-token", refreshTokenController);

router.post("/logout", verifyToken, logoutUser);



module.exports = router;
