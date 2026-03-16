const express = require("express");
const router = express.Router();
const {
    handleCreateConduct,
    handleGetAllConduct,
    handleGetOneConduct,
    handleUpdateConduct,
    handleDeleteConduct,
    handleGetActiveConduct
} = require("../controllers/ConductSetting.controller");

const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.post("/create-conduct", verifyToken, authorizeRoles("admin"), handleCreateConduct);
router.post("/", verifyToken, authorizeRoles("admin"), handleGetAllConduct);
router.get("/active", verifyToken, authorizeRoles("admin", "teacher"), handleGetActiveConduct);
router.get("/:id", verifyToken, authorizeRoles("admin"), handleGetOneConduct);
router.patch("/:id", verifyToken, authorizeRoles("admin"), handleUpdateConduct);
router.delete("/:id", verifyToken, authorizeRoles("admin"), handleDeleteConduct);

module.exports = router;
