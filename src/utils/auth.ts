import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { Request } from "express";
import { AuthenticatedUser } from "./types.js";

const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TTL || "15m") as SignOptions["expiresIn"];
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 7);
const REFRESH_TOKEN_TTL = `${REFRESH_TOKEN_TTL_DAYS}d` as SignOptions["expiresIn"];
const accessTokenSecret = process.env.JWT_ACCESS_SECRET || "change-me-access-secret";
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || "change-me-refresh-secret";

type AccessTokenClaims = JwtPayload & {
  sub: string;
};

type RefreshTokenClaims = JwtPayload & {
  sub: string;
  loginId: number;
};

export const getRequestIp = (req: Request): string | null => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return req.ip || null;
};

export const getRefreshTokenExpiry = (): Date =>
  new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

export const signAccessToken = (userId: number): string =>
  jwt.sign(
    {
      sub: String(userId)
    },
    accessTokenSecret,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

export const signRefreshToken = (userId: number, loginId: number): string =>
  jwt.sign(
    {
      sub: String(userId),
      loginId
    },
    refreshTokenSecret,
    { expiresIn: REFRESH_TOKEN_TTL }
  );

export const verifyAccessToken = (token: string): AccessTokenClaims =>
  jwt.verify(token, accessTokenSecret) as AccessTokenClaims;

export const verifyRefreshToken = (token: string): RefreshTokenClaims =>
  jwt.verify(token, refreshTokenSecret) as RefreshTokenClaims;

export const buildAuthenticatedUser = (user: {
  id: number;
  name: string;
  email: string;
}): AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email
});
