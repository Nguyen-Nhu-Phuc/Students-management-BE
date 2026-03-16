// routes/Class.routes.js
const express = require("express");
const router = express.Router();

const { createPeriodController, updatePeriodController, getAllPeriodController, getOnePeriodController, deletePeriodController } = require("../controllers/Period.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");


router.post('/create', verifyToken, authorizeRoles('admin'), createPeriodController)
router.patch('/update/:id', verifyToken, authorizeRoles('admin'), updatePeriodController)
router.post('/get-all', verifyToken, authorizeRoles('admin'), getAllPeriodController)
router.get('/get-one/:id', verifyToken, authorizeRoles('admin'), getOnePeriodController)
router.delete('/delete/:id', verifyToken, authorizeRoles('admin'), deletePeriodController)


module.exports = router;
