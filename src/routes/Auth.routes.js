const express = require("express");
const {
  handleChangePassword,
  handleResetPassword,
} = require("../controllers/User.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// User tự đổi mật khẩu
router.post("/change-password", verifyToken, handleChangePassword);

// Admin reset mật khẩu cho user khác
router.post(
  "/reset-password",
  verifyToken,
  authorizeRoles("admin"),
  handleResetPassword
);

module.exports = router;
