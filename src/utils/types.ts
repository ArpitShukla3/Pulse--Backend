import { Request } from "express";

export const EMAIL_TYPE = "email";
export const SMS_TYPE = "sms";

export type AuthenticatedUser = {
  id: number;
  email: string;
  name: string;
};

export interface UserRequest extends Request {
  user: {
    id: number;
  };
}
