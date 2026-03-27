"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const controller_js_1 = require("../controllers/controller.js");
const chatController_js_1 = require("../controllers/chatController.js");
const authRouter = (0, express_1.Router)();
authRouter.post("/signup", authController_js_1.signup);
authRouter.post("/signin", authController_js_1.signin);
authRouter.post("/refresh-token", authController_js_1.refreshToken);
authRouter.post("/signout", authController_js_1.signout);
authRouter.get("/me", authMiddleware_js_1.requireAccessToken, authController_js_1.getAuthenticatedUser);
// find this user
// authRouter.get("/app/findUsers",requireAccessToken,findUsers);
authRouter.get("/app/findUsers", authMiddleware_js_1.requireAccessToken, controller_js_1.findUsersv2);
// chatting routes
authRouter.get("/app/chats/:id", authMiddleware_js_1.requireAccessToken, chatController_js_1.getThisChat);
authRouter.get("/app/chats", authMiddleware_js_1.requireAccessToken, chatController_js_1.getAllChats);
authRouter.post("/app/chats/:id", authMiddleware_js_1.requireAccessToken, chatController_js_1.sendMessage);
authRouter.post("/app/direct", authMiddleware_js_1.requireAccessToken, chatController_js_1.createChat);
exports.default = authRouter;
