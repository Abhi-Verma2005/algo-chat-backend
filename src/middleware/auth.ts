import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare const process: any;
const JWT_SECRET = process.env?.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = (req as any).headers?.authorization;
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    next();
  } catch (error) {
    console.error('❌ [AUTH] Token verification failed:', error);
    res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = (req as any).headers?.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as AuthenticatedRequest).user = {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username
      };
    } catch (error) {
      // Token invalid; continue without user
    }
  }
  
  next();
}; 