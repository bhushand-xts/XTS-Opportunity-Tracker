import { Request, Response, NextFunction } from 'express';

// Validates the token and puts the user on the request.
// Placeholder: msttbl_user has no email or external id column yet.

export default function auth(req: Request, res: Response, next: NextFunction): void {
  (req as any).user = null;
  next();
}
