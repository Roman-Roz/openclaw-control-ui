import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Custom error class for operational errors
export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found middleware
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Global error handler
export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = (err as ApiError).statusCode || 500;
  const isOperational = (err as ApiError).isOperational || false;

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } else if (!isOperational) {
    logger.warn('Client Error:', {
      message: err.message,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      message: isOperational ? err.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

// Async handler wrapper to catch promise rejections
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (errors: any[]) => {
  return new AppError(
    `Validation failed: ${errors.map((e) => e.message).join(', ')}`,
    400
  );
};
