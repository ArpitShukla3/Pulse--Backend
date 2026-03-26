import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 7;
const accessTokenSecret = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const getRequestIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0]?.trim() || null;
    }
    return req.ip || null;
};
const buildSafeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email
});
const createAccessToken = (user) => jwt.sign({
    sub: user.id,
    email: user.email
}, accessTokenSecret, { expiresIn: ACCESS_TOKEN_TTL });
const issueSession = async (user, deviceType, deviceIP) => {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const login = await prisma.login.create({
        data: {
            userId: user.id,
            deviceType,
            deviceIP,
            expTime: expiresAt
        }
    });
    const refreshToken = jwt.sign({
        sub: user.id,
        loginId: login.loginId
    }, refreshTokenSecret, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` });
    await prisma.login.update({
        where: { loginId: login.loginId },
        data: {
            refreshToken,
            expTime: expiresAt
        }
    });
    return {
        accessToken: createAccessToken(user),
        refreshToken,
        loginId: login.loginId,
        expiresAt
    };
};
export const signup = async (req, res) => {
    try {
        const { name, email, password, deviceType } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                message: "name, email and password are required"
            });
            return;
        }
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(409).json({
                message: "User already exists"
            });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword
            }
        });
        const safeUser = buildSafeUser(user);
        const session = await issueSession(safeUser, deviceType || null, getRequestIp(req));
        res.status(201).json({
            message: "Signup successful",
            user: safeUser,
            tokens: session
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Signup failed";
        res.status(500).json({ message });
    }
};
export const signin = async (req, res) => {
    try {
        const { email, password, deviceType } = req.body;
        if (!email || !password) {
            res.status(400).json({
                message: "email and password are required"
            });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            res.status(401).json({
                message: "Invalid credentials"
            });
            return;
        }
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            res.status(401).json({
                message: "Invalid credentials"
            });
            return;
        }
        const safeUser = buildSafeUser(user);
        const session = await issueSession(safeUser, deviceType || null, getRequestIp(req));
        res.status(200).json({
            message: "Signin successful",
            user: safeUser,
            tokens: session
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Signin failed";
        res.status(500).json({ message });
    }
};
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken: providedRefreshToken } = req.body;
        if (!providedRefreshToken) {
            res.status(400).json({
                message: "refreshToken is required"
            });
            return;
        }
        const decoded = jwt.verify(providedRefreshToken, refreshTokenSecret);
        const login = await prisma.login.findUnique({
            where: { loginId: decoded.loginId },
            include: { user: true }
        });
        if (!login ||
            !login.user ||
            login.refreshToken !== providedRefreshToken ||
            !login.expTime ||
            login.expTime.getTime() < Date.now()) {
            res.status(401).json({
                message: "Invalid refresh token"
            });
            return;
        }
        const safeUser = buildSafeUser(login.user);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
        const newRefreshToken = jwt.sign({
            sub: safeUser.id,
            loginId: login.loginId
        }, refreshTokenSecret, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` });
        await prisma.login.update({
            where: { loginId: login.loginId },
            data: {
                refreshToken: newRefreshToken,
                expTime: expiresAt
            }
        });
        res.status(200).json({
            message: "Token refreshed",
            tokens: {
                accessToken: createAccessToken(safeUser),
                refreshToken: newRefreshToken,
                loginId: login.loginId,
                expiresAt
            }
        });
    }
    catch (_error) {
        res.status(401).json({
            message: "Invalid refresh token"
        });
    }
};
export const signout = async (req, res) => {
    try {
        const { refreshToken: providedRefreshToken } = req.body;
        if (!providedRefreshToken) {
            res.status(400).json({
                message: "refreshToken is required"
            });
            return;
        }
        await prisma.login.deleteMany({
            where: {
                refreshToken: providedRefreshToken
            }
        });
        res.status(200).json({
            message: "Signed out successfully"
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Signout failed";
        res.status(500).json({ message });
    }
};
