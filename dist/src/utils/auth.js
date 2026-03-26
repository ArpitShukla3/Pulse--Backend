import jwt from "jsonwebtoken";
const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TTL || "15m");
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 7);
const REFRESH_TOKEN_TTL = `${REFRESH_TOKEN_TTL_DAYS}d`;
const accessTokenSecret = process.env.JWT_ACCESS_SECRET || "change-me-access-secret";
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || "change-me-refresh-secret";
export const getRequestIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0]?.trim() || null;
    }
    return req.ip || null;
};
export const getRefreshTokenExpiry = () => new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
export const signAccessToken = (userId) => jwt.sign({
    sub: String(userId)
}, accessTokenSecret, { expiresIn: ACCESS_TOKEN_TTL });
export const signRefreshToken = (userId, loginId) => jwt.sign({
    sub: String(userId),
    loginId
}, refreshTokenSecret, { expiresIn: REFRESH_TOKEN_TTL });
export const verifyAccessToken = (token) => jwt.verify(token, accessTokenSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, refreshTokenSecret);
export const buildAuthenticatedUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email
});
