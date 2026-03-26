import { verifyAccessToken } from "../utils/auth.js";
export const requireAccessToken = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;
        if (!authorization?.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Access token is required"
            });
            return;
        }
        const token = authorization.slice("Bearer ".length);
        const decoded = verifyAccessToken(token);
        const userId = Number(decoded.sub);
        if (Number.isNaN(userId)) {
            res.status(401).json({
                message: "Invalid access token"
            });
            return;
        }
        req.user = { id: userId };
        next();
    }
    catch (_error) {
        res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};
