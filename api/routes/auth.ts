import { Router, type Response } from 'express';
import { db } from '../services/database.js';
import { AuthRequest } from '../services/validation.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req: AuthRequest, res: Response): void => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请输入用户名和密码',
      },
    });
    return;
  }
  
  const user = db.users.findByUsername(username);
  
  if (!user || user.password !== password) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '用户名或密码错误',
      },
    });
    return;
  }
  
  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
  });
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
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
  
  res.json({
    success: true,
    data: req.user,
  });
});

export default router;
