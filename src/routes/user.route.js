import { Router } from "express";
import { loginController, logoutController, refreshAccessToken, registerController } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1    
        }
    ]),
    registerController);
router.route("/login").post(loginController);

//safe routes

router.route("/logout").post(verifyJWT , logoutController);
router.route("/refresh-token").post(refreshAccessToken)

export default router;