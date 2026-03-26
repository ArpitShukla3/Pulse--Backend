import { Router } from "express";
import {
  getAuthenticatedUser,
  refreshToken,
  signin,
  signout,
  signup
} from "../controllers/authController.js";
import { requireAccessToken } from "../middleware/authMiddleware.js";
import { findUsersv2 } from "../controllers/controller.js";
import { createChat, getAllChats, getThisChat, sendMessage } from "../controllers/chatController.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.post("/refresh-token", refreshToken);
authRouter.post("/signout", signout);
authRouter.get("/me", requireAccessToken, getAuthenticatedUser);


// find this user
// authRouter.get("/app/findUsers",requireAccessToken,findUsers);
authRouter.get("/app/findUsers",requireAccessToken,findUsersv2);

// chatting routes
authRouter.get("/app/chats/:id",requireAccessToken,getThisChat);
authRouter.get("/app/chats",requireAccessToken,getAllChats);
authRouter.post("/app/chats/:id", requireAccessToken,sendMessage);
authRouter.post("/app/direct",requireAccessToken,createChat);
export default authRouter;
