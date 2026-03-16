

// routes/Class.routes.js
const express = require("express");
const router = express.Router();

const { createScoreTypeController, getAllScoreTypeController, editScoreTypeController, syncScoreTypesController } = require("../controllers/ScoreType.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

router.post('/score-type/create', verifyToken, authorizeRoles('admin'), createScoreTypeController)
router.post('/score-type/get-all', verifyToken, authorizeRoles('admin'), getAllScoreTypeController);
router.patch('/score-type/edit/:id', verifyToken, authorizeRoles('admin'), editScoreTypeController);
router.post('/score-type/sync', verifyToken, authorizeRoles('admin', 'teacher'), syncScoreTypesController);


module.exports = router;
