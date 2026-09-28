import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Invalid request body.';
      res.status(400).json({
        status: 'error',
        message,
      });
      return;
    }
    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Invalid query parameters.';
      res.status(400).json({
        status: 'error',
        message,
      });
      return;
    }
    req.query = result.data as Request['query'];
    next();
  };
};
