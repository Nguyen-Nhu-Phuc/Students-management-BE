const express = require("express");
const router = express.Router();
const {
  handleCreateGrade,
  handlegetAllGrade,
  handlegetOneGrade,
  handleGetNumberGrade,
  handlehandleEditGrade
} = require("../controllers/Grade.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

// CRUD cho Grade
router.post(
  "/create-grade",
  verifyToken,
  authorizeRoles("admin"),
  handleCreateGrade
);

router.get(
  "/count",
  verifyToken,
  authorizeRoles("admin"),
  handleGetNumberGrade
);
router.post("/", verifyToken, authorizeRoles("admin"), handlegetAllGrade);
router.get("/:id", verifyToken, authorizeRoles("admin"), handlegetOneGrade);
router.patch("/:id", verifyToken, authorizeRoles("admin"), handlehandleEditGrade);
// router.delete("/:id", gradeController.deleteGrade);

module.exports = router;
