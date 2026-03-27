"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatedUser = exports.signout = exports.refreshToken = exports.signin = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = require("dotenv");
const prisma_js_1 = __importDefault(require("../config/prisma.js"));
const notify_js_1 = require("../notification/notify.js");
const auth_js_1 = require("../utils/auth.js");
const notifyProducers_js_1 = require("../kafka/notifyProducers.js");
const syncUser_js_1 = require("../openSearch/syncUser.js");
(0, dotenv_1.configDotenv)();
const createLoginSession = async ({ userId, deviceType, deviceIP }) => {
    const normalizedDeviceType = deviceType?.trim() || "unknown";
    const expTime = (0, auth_js_1.getRefreshTokenExpiry)();
    const existingLogin = await prisma_js_1.default.login.findFirst({
        where: {
            userId,
            deviceType: normalizedDeviceType
        }
    });
    const refreshToken = (0, auth_js_1.signRefreshToken)(userId, existingLogin?.loginId || 0);
    const login = existingLogin
        ? await prisma_js_1.default.login.update({
            where: { loginId: existingLogin.loginId },
            data: {
                refreshToken,
                expTime,
                deviceIP
            }
        })
        : await prisma_js_1.default.login.create({
            data: {
                userId,
                deviceType: normalizedDeviceType,
                deviceIP,
                expTime,
                refreshToken
            }
        });
    const nextRefreshToken = existingLogin?.loginId === login.loginId ? refreshToken : (0, auth_js_1.signRefreshToken)(userId, login.loginId);
    if (nextRefreshToken !== refreshToken) {
        await prisma_js_1.default.login.update({
            where: { loginId: login.loginId },
            data: { refreshToken: nextRefreshToken }
        });
    }
    return {
        loginId: login.loginId,
        refreshToken: nextRefreshToken,
        expTime
    };
};
const buildAuthResponse = async ({ user, deviceType, deviceIP }) => {
    const safeUser = (0, auth_js_1.buildAuthenticatedUser)(user);
    const session = await createLoginSession({
        userId: user.id,
        deviceType,
        deviceIP
    });
    return {
        user: safeUser,
        accessToken: (0, auth_js_1.signAccessToken)(user.id),
        refreshToken: session.refreshToken,
        loginId: session.loginId,
        refreshTokenExpiresAt: session.expTime
    };
};
const signup = async (req, res) => {
    try {
        const { name, email, password, deviceType } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                message: "name, email and password are required"
            });
            return;
        }
        const existingUser = await prisma_js_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(409).json({
                message: "User already exists"
            });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_js_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        });
        const auth = await buildAuthResponse({
            user,
            deviceType,
            deviceIP: (0, auth_js_1.getRequestIp)(req)
        });
        await (0, notify_js_1.notify)({
            typeOfMessage: "signup-verification",
            channel: "email",
            addr: email,
            subject: "no-Reply",
            content: "Sign up clicking on this link: http://localhost:5173/login",
            metadata: {
                userId: String(user.id)
            }
        });
        const payload = (0, syncUser_js_1.createUserPayload)(name, email, user.id);
        (0, notifyProducers_js_1.publishUserSync)(payload);
        res.status(201).json({
            message: "Signup successful",
            ...auth
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Signup failed";
        res.status(500).json({
            message
        });
    }
};
exports.signup = signup;
const signin = async (req, res) => {
    try {
        const { email, password, deviceType } = req.body;
        if (!email || !password) {
            res.status(400).json({
                message: "email and password are required"
            });
            return;
        }
        const user = await prisma_js_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true
            }
        });
        if (!user) {
            res.status(401).json({
                message: "Invalid credentials"
            });
            return;
        }
        const passwordMatches = await bcryptjs_1.default.compare(password, user.password);
        if (!passwordMatches) {
            res.status(401).json({
                message: "Invalid credentials"
            });
            return;
        }
        const auth = await buildAuthResponse({
            user,
            deviceType,
            deviceIP: (0, auth_js_1.getRequestIp)(req)
        });
        res.status(200).json({
            message: "Signin successful",
            ...auth
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Signin failed";
        res.status(500).json({
            message
        });
    }
};
exports.signin = signin;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: providedRefreshToken, deviceType } = req.body;
        if (!providedRefreshToken) {
            res.status(400).json({
                message: "refreshToken is required"
            });
            return;
        }
        const decoded = (0, auth_js_1.verifyRefreshToken)(providedRefreshToken);
        const login = await prisma_js_1.default.login.findUnique({
            where: { loginId: decoded.loginId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!login ||
            !login.user ||
            login.refreshToken !== providedRefreshToken ||
            login.expTime.getTime() < Date.now()) {
            if (login?.expTime && login.expTime.getTime() < Date.now()) {
                await prisma_js_1.default.login.delete({
                    where: { loginId: login.loginId }
                });
            }
            res.status(401).json({
                message: "Refresh token expired, please signin again"
            });
            return;
        }
        const expTime = (0, auth_js_1.getRefreshTokenExpiry)();
        const nextRefreshToken = (0, auth_js_1.signRefreshToken)(login.user.id, login.loginId);
        await prisma_js_1.default.login.update({
            where: { loginId: login.loginId },
            data: {
                refreshToken: nextRefreshToken,
                expTime,
                deviceType: deviceType || login.deviceType || undefined,
                deviceIP: (0, auth_js_1.getRequestIp)(req)
            }
        });
        const safeUser = (0, auth_js_1.buildAuthenticatedUser)(login.user);
        res.status(200).json({
            message: "Token refreshed",
            user: safeUser,
            accessToken: (0, auth_js_1.signAccessToken)(login.user.id),
            refreshToken: nextRefreshToken,
            loginId: login.loginId,
            refreshTokenExpiresAt: expTime
        });
    }
    catch (_error) {
        res.status(401).json({
            message: "Invalid or expired refresh token, please signin again"
        });
    }
};
exports.refreshToken = refreshToken;
const signout = async (req, res) => {
    try {
        const { refreshToken: providedRefreshToken } = req.body;
        if (!providedRefreshToken) {
            res.status(400).json({
                message: "refreshToken is required"
            });
            return;
        }
        const login = await prisma_js_1.default.login.findUnique({
            where: {
                refreshToken: providedRefreshToken
            }
        });
        if (!login) {
            res.status(404).json({
                message: "Login session not found"
            });
            return;
        }
        await prisma_js_1.default.login.delete({
            where: {
                loginId: login.loginId
            }
        });
        res.status(200).json({
            message: "Signout successful"
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Signout failed";
        res.status(500).json({
            message
        });
    }
};
exports.signout = signout;
const getAuthenticatedUser = async (req, res) => {
    const userRequest = req;
    const user = await prisma_js_1.default.user.findUnique({
        where: { id: userRequest.user.id },
        select: {
            id: true,
            name: true,
            email: true
        }
    });
    if (!user) {
        res.status(404).json({
            message: "User not found"
        });
        return;
    }
    res.status(200).json({
        user
    });
};
exports.getAuthenticatedUser = getAuthenticatedUser;
