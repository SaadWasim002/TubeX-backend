import { Router } from "express";
import { registerController } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerController);

export default router;