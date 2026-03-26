import { Router } from "express";
import { refreshToken, signin, signout, signup } from "../controllers/authController.js";
const authRouter = Router();
authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.post("/refresh-token", refreshToken);
authRouter.post("/signout", signout);
export default authRouter;
