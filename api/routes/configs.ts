import { Router, type Response } from 'express';
import { db, generateId, getCurrentTimestamp, type FilterConfig } from '../services/database.js';
import { AuthRequest } from '../services/validation.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const configs = db.configs.findAll();
  
  res.json({
    success: true,
    data: configs,
  });
});

router.post('/', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const { name, filters } = req.body;
  const user = req.user!;
  
  if (!name || name.trim() === '') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请填写配置名称' },
    });
    return;
  }
  
  const config: FilterConfig = {
    id: generateId(),
    name: name.trim(),
    filters: filters || {},
    createdBy: user.id,
    createdAt: getCurrentTimestamp(),
  };
  
  db.configs.create(config);
  
  res.status(201).json({
    success: true,
    data: config,
  });
});

router.delete('/:id', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const config = db.configs.findById(req.params.id);
  
  if (!config) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '配置不存在' },
    });
    return;
  }
  
  db.configs.delete(req.params.id);
  
  res.json({
    success: true,
    data: null,
  });
});

export default router;
