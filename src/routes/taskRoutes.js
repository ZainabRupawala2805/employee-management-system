// const express = require("express");
// const taskController = require("../controllers/taskController");
// const authenticateUser = require("../middlewares/authentication");
// const router = express.Router();

// // Route to create a task
// router.post("/create-task",authenticateUser, taskController.createTask);
// router.patch("/update-task/:id",authenticateUser, taskController.updateTask);
// router.get("/get-all", authenticateUser,taskController.getAllTasks);
// router.get("/get-by-id/:id", authenticateUser,taskController.getTaskById);

// module.exports = router;

const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const upload = require("../middlewares/uploadFile");
const authenticateUser = require("../middlewares/authentication");


router.post(
    "/create-task",
    upload.array("attachments", 10), // Accept up to 10 files
    authenticateUser,
    taskController.createTask
);

router.put(
    "/update-task/:taskId",
    upload.array("attachments", 10),
    authenticateUser,
    taskController.updateTask
);

router.get("/get-all", authenticateUser, taskController.getAllTasks);
router.get("/get-by-id/:id", authenticateUser, taskController.getTaskById);
router.delete("/delete-task/:taskId", authenticateUser, taskController.deleteTask);
router.get("/get-by-project", authenticateUser, taskController.getTasksByProject);
router.get("/get-by-project/:projectId", authenticateUser, taskController.getTasksByProject);
router.delete('/:taskId/attachments/:attachmentId', taskController.deleteAttachment);


module.exports = router;
