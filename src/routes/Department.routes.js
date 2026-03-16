
const express = require("express");
const router = express.Router();

const departmentService = require("../controllers/Department.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.get(
    "/count",
    verifyToken,
    authorizeRoles("admin"),
    departmentService.handleGetNumberDepartment
);

router.post("/create", verifyToken, authorizeRoles("admin"), departmentService.createDepartmentController);
router.post("/", verifyToken, authorizeRoles("admin"), departmentService.getAllDepartmentsController);
router.get("/:id", verifyToken, authorizeRoles("admin"), departmentService.getDepartmentByIdController);
router.patch("/:id", verifyToken, authorizeRoles("admin"), departmentService.updateDepartmentController);
router.delete("/:id", verifyToken, authorizeRoles("admin"), departmentService.deleteDepartmentController);
router.patch("/assign/:id", verifyToken, authorizeRoles("admin"), departmentService.assignHeadOfDepartmentController);
router.get("/list-head-of-department/:id", verifyToken, authorizeRoles("admin"), departmentService.listSelectHeadOfDepartmentController)
router.get("/list-subject/:id", verifyToken, authorizeRoles("admin"), departmentService.getAllSubjectInDepartmentController);

module.exports = router;
