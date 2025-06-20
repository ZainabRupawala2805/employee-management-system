const express = require("express");
const authenticateUser = require("../middlewares/authentication");
const { createLeaveController, updateLeaveStatusController, getLeaveByIdController, getLeavesByUserIdController, getAllFilteredLeavesController, updateLeaveController } = require("../controllers/leaveController");
const upload = require('../middlewares/uploadFile');

const router = express.Router();

router.post("/leave-request", upload.single('attachment'), authenticateUser, createLeaveController);
router.patch("/status/:leaveId",authenticateUser, updateLeaveStatusController);
// router.get("/get-all-leaves",authenticateUser, getAllLeavesController);
router.get('/get-by-id/:leaveId',authenticateUser, getLeaveByIdController);
router.get('/get-by-userid/:userId', authenticateUser,getLeavesByUserIdController);
router.get('/get-filtered-leaves', authenticateUser, getAllFilteredLeavesController)
router.post('/update/:leaveId', upload.single('attachment'), authenticateUser,updateLeaveController);

module.exports = router;