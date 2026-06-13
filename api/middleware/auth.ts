import { Response, NextFunction } from 'express';
import { AuthRequest, AuthUser } from '../services/validation.js';
import { db } from '../services/database.js';

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '请先登录',
      },
    });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = db.users.findById(token);
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '登录已过期，请重新登录',
      },
    });
    return;
  }
  
  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  };
  
  next();
}

export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      const roleNames: Record<string, string> = {
        journalist: '记者',
        editor: '编辑',
        legal: '法务',
        admin: '管理员',
      };
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `${roleNames[req.user.role] || req.user.role}无权执行此操作`,
        },
      });
      return;
    }
    
    next();
  };
}
