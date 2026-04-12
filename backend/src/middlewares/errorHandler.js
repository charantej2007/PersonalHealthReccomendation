import { ZodError } from 'zod';
import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      issues: err.issues,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  console.error(err);
  
  const includeError = env.NODE_ENV !== 'production' || env.DEBUG_MODE;

  return res.status(500).json({
    message: includeError ? err.message : 'Internal server error',
    details: includeError ? err.stack : undefined,
  });
}
