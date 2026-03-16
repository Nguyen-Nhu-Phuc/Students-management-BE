// routes/Class.routes.js
const express = require("express");
const router = express.Router();
const {
  createSubjectController,
  handleGetAllSubject,
  HandleGetOneSubject,
  HandleEditSubject,
  handleGetNumberSubject,
  deleteSubjectController,
  getListSubjectsNotInDepartmentController
} = require("../controllers/Subject.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.get(
  "/count",
  verifyToken,
  authorizeRoles("admin"),
  handleGetNumberSubject
);

router.post(
  "/create",
  verifyToken,
  authorizeRoles("admin"),
  createSubjectController
);


router.post("/", verifyToken, authorizeRoles("admin"), handleGetAllSubject);

router.get("/:id", verifyToken, authorizeRoles("admin"), HandleGetOneSubject);

router.patch("/:id", verifyToken, authorizeRoles("admin"), HandleEditSubject);

router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteSubjectController);

router.get(
  "/not-in-department/list",
  verifyToken,
  authorizeRoles("admin"),
  getListSubjectsNotInDepartmentController
);

module.exports = router;
