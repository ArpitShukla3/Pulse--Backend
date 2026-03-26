import bcrypt from "bcryptjs";
import { configDotenv } from "dotenv";
import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { notify } from "../notification/notify.js";
import {
  buildAuthenticatedUser,
  getRefreshTokenExpiry,
  getRequestIp,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../utils/auth.js";
import { UserRequest } from "../utils/types.js";
import { publishUserSync } from "../kafka/notifyProducers.js";
import { createUserPayload } from "../openSearch/syncUser.js";

configDotenv();

const createLoginSession = async ({
  userId,
  deviceType,
  deviceIP
}: {
  userId: number;
  deviceType?: string;
  deviceIP: string | null;
}) => {
  const normalizedDeviceType = deviceType?.trim() || "unknown";
  const expTime = getRefreshTokenExpiry();
  const existingLogin = await prisma.login.findFirst({
    where: {
      userId,
      deviceType: normalizedDeviceType
    }
  });
  const refreshToken = signRefreshToken(userId, existingLogin?.loginId || 0);

  const login = existingLogin
    ? await prisma.login.update({
        where: { loginId: existingLogin.loginId },
        data: {
          refreshToken,
          expTime,
          deviceIP
        }
      })
    : await prisma.login.create({
        data: {
          userId,
          deviceType: normalizedDeviceType,
          deviceIP,
          expTime,
          refreshToken
        }
      });

  const nextRefreshToken =
    existingLogin?.loginId === login.loginId ? refreshToken : signRefreshToken(userId, login.loginId);

  if (nextRefreshToken !== refreshToken) {
    await prisma.login.update({
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

const buildAuthResponse = async ({
  user,
  deviceType,
  deviceIP
}: {
  user: { id: number; name: string; email: string };
  deviceType?: string;
  deviceIP: string | null;
}) => {
  const safeUser = buildAuthenticatedUser(user);
  const session = await createLoginSession({
    userId: user.id,
    deviceType,
    deviceIP
  });

  return {
    user: safeUser,
    accessToken: signAccessToken(user.id),
    refreshToken: session.refreshToken,
    loginId: session.loginId,
    refreshTokenExpiresAt: session.expTime
  };
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, deviceType } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      deviceType?: string;
    };

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
      deviceIP: getRequestIp(req)
    });

    await notify({
      typeOfMessage: "signup-verification",
      channel: "email",
      addr: email,
      subject: "no-Reply",
      content: "Sign up clicking on this link: http://localhost:5173/login",
      metadata: {
        userId: String(user.id)
      }
    });
    const payload = createUserPayload(name,email,user.id);
    publishUserSync(payload);
    res.status(201).json({
      message: "Signup successful",
      ...auth
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";

    res.status(500).json({
      message
    });
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, deviceType } = req.body as {
      email?: string;
      password?: string;
      deviceType?: string;
    };

    if (!email || !password) {
      res.status(400).json({
        message: "email and password are required"
      });
      return;
    }

    const user = await prisma.user.findUnique({
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

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      res.status(401).json({
        message: "Invalid credentials"
      });
      return;
    }

    const auth = await buildAuthResponse({
      user,
      deviceType,
      deviceIP: getRequestIp(req)
    });

    res.status(200).json({
      message: "Signin successful",
      ...auth
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signin failed";

    res.status(500).json({
      message
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: providedRefreshToken, deviceType } = req.body as {
      refreshToken?: string;
      deviceType?: string;
    };

    if (!providedRefreshToken) {
      res.status(400).json({
        message: "refreshToken is required"
      });
      return;
    }

    const decoded = verifyRefreshToken(providedRefreshToken);

    const login = await prisma.login.findUnique({
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

    if (
      !login ||
      !login.user ||
      login.refreshToken !== providedRefreshToken ||
      login.expTime.getTime() < Date.now()
    ) {
      if (login?.expTime && login.expTime.getTime() < Date.now()) {
        await prisma.login.delete({
          where: { loginId: login.loginId }
        });
      }

      res.status(401).json({
        message: "Refresh token expired, please signin again"
      });
      return;
    }

    const expTime = getRefreshTokenExpiry();
    const nextRefreshToken = signRefreshToken(login.user.id, login.loginId);

    await prisma.login.update({
      where: { loginId: login.loginId },
      data: {
        refreshToken: nextRefreshToken,
        expTime,
        deviceType: deviceType || login.deviceType || undefined,
        deviceIP: getRequestIp(req)
      }
    });

    const safeUser = buildAuthenticatedUser(login.user);

    res.status(200).json({
      message: "Token refreshed",
      user: safeUser,
      accessToken: signAccessToken(login.user.id),
      refreshToken: nextRefreshToken,
      loginId: login.loginId,
      refreshTokenExpiresAt: expTime
    });
  } catch (_error) {
    res.status(401).json({
      message: "Invalid or expired refresh token, please signin again"
    });
  }
};

export const signout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: providedRefreshToken } = req.body as {
      refreshToken?: string;
    };

    if (!providedRefreshToken) {
      res.status(400).json({
        message: "refreshToken is required"
      });
      return;
    }

    const login = await prisma.login.findUnique({
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

    await prisma.login.delete({
      where: {
        loginId: login.loginId
      }
    });

    res.status(200).json({
      message: "Signout successful"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signout failed";

    res.status(500).json({
      message
    });
  }
};

export const getAuthenticatedUser = async (req: Request, res: Response): Promise<void> => {
  const userRequest = req as UserRequest;
  const user = await prisma.user.findUnique({
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
