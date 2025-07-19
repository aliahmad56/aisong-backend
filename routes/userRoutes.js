var express = require("express");
var router = express.Router();
var userController = require("../controllers/userController");
const { userVerifyToken } = require("../middlewares/authMiddleware");

router.post("/signup", userController.userRegistration);
router.get("/getLoggedInUser", userVerifyToken, userController.getCurrentUser);
router.post("/login", userController.login);
router.post("/send-otp", userController.sendOtp);
router.post("/verify-otp", userController.confirmOtp);
router.post("/reset-password", userController.resetPassword);
router.get("/", userController.allUserList);

router.post("/invite", userController.inviteUser);

module.exports = router;
