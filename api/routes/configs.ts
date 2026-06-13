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
  
  const trimmedName = name?.trim();
  if (!trimmedName) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '配置名称不能为空' },
    });
    return;
  }
  
  const existingConfigs = db.configs.findByCreatorId(user.id);
  const existingConfig = existingConfigs.find(c => c.name === trimmedName);
  
  if (existingConfig) {
    const updatedConfig: FilterConfig = {
      ...existingConfig,
      filters: filters || {},
      updatedAt: getCurrentTimestamp(),
    };
    
    db.configs.update(existingConfig.id, updatedConfig);
    
    res.json({
      success: true,
      data: updatedConfig,
      message: '配置已覆盖更新',
      action: 'updated',
    });
    return;
  }
  
  const config: FilterConfig = {
    id: generateId(),
    name: trimmedName,
    filters: filters || {},
    createdBy: user.id,
    createdAt: getCurrentTimestamp(),
  };
  
  db.configs.create(config);
  
  res.status(201).json({
    success: true,
    data: config,
    message: '配置创建成功',
    action: 'created',
  });
});

router.put('/:id', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const { name, filters } = req.body;
  const user = req.user!;
  const configId = req.params.id;
  
  const existingConfig = db.configs.findById(configId);
  
  if (!existingConfig) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '配置不存在' },
    });
    return;
  }
  
  if (existingConfig.createdBy !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '无权修改此配置' },
    });
    return;
  }
  
  const trimmedName = name?.trim();
  if (!trimmedName) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '配置名称不能为空' },
    });
    return;
  }
  
  const updatedConfig: FilterConfig = {
    ...existingConfig,
    name: trimmedName,
    filters: filters || existingConfig.filters,
    updatedAt: getCurrentTimestamp(),
  };
  
  db.configs.update(configId, updatedConfig);
  
  res.json({
    success: true,
    data: updatedConfig,
    message: '配置更新成功',
  });
});

router.delete('/:id', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const configId = req.params.id;
  
  const config = db.configs.findById(configId);
  
  if (!config) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '配置不存在' },
    });
    return;
  }
  
  if (config.createdBy !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '无权删除此配置' },
    });
    return;
  }
  
  db.configs.delete(configId);
  
  res.json({
    success: true,
    data: null,
    message: '配置已删除',
  });
});

export default router;
