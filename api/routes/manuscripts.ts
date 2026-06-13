import { Router, type Response } from 'express';
import { db, generateId, getCurrentTimestamp, type Manuscript } from '../services/database.js';
import { AuthRequest, validateRole } from '../services/validation.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const manuscripts = db.manuscripts.findAll();
  const user = req.user!;
  
  let filteredManuscripts = manuscripts;
  if (user.role === 'journalist') {
    filteredManuscripts = manuscripts.filter(m => m.authorId === user.id);
  }
  
  res.json({
    success: true,
    data: filteredManuscripts,
  });
});

router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const manuscript = db.manuscripts.findById(req.params.id);
  
  if (!manuscript) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '稿件不存在',
      },
    });
    return;
  }
  
  const user = req.user!;
  if (user.role === 'journalist' && manuscript.authorId !== user.id) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '无权查看此稿件',
      },
    });
    return;
  }
  
  res.json({
    success: true,
    data: manuscript,
  });
});

router.post('/', authMiddleware, roleMiddleware(['journalist']), (req: AuthRequest, res: Response): void => {
  const { title, content, status } = req.body;
  const user = req.user!;
  
  if (!title || title.trim() === '') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请填写标题',
      },
    });
    return;
  }
  
  const now = getCurrentTimestamp();
  const manuscript: Manuscript = {
    id: generateId(),
    title: title.trim(),
    content: content?.trim() || '',
    authorId: user.id,
    authorName: user.displayName,
    status: status === 'published' ? 'published' : 'draft',
    publishedAt: status === 'published' ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  
  db.manuscripts.create(manuscript);
  
  res.status(201).json({
    success: true,
    data: manuscript,
  });
});

router.put('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const manuscript = db.manuscripts.findById(req.params.id);
  const user = req.user!;
  
  if (!manuscript) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '稿件不存在',
      },
    });
    return;
  }
  
  if (user.role === 'journalist' && manuscript.authorId !== user.id) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '无权修改此稿件',
      },
    });
    return;
  }
  
  const { title, content, status } = req.body;
  const updates: Partial<Manuscript> = {
    updatedAt: getCurrentTimestamp(),
  };
  
  if (title !== undefined) updates.title = title.trim();
  if (content !== undefined) updates.content = content.trim();
  if (status !== undefined && status === 'published') {
    updates.status = 'published';
    updates.publishedAt = getCurrentTimestamp();
  }
  
  const updated = db.manuscripts.update(req.params.id, updates);
  
  res.json({
    success: true,
    data: updated,
  });
});

router.delete('/:id', authMiddleware, roleMiddleware(['journalist']), (req: AuthRequest, res: Response): void => {
  const manuscript = db.manuscripts.findById(req.params.id);
  const user = req.user!;
  
  if (!manuscript) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '稿件不存在',
      },
    });
    return;
  }
  
  if (manuscript.authorId !== user.id) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '无权删除此稿件',
      },
    });
    return;
  }
  
  if (manuscript.status === 'published') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '已发布的稿件不可删除',
      },
    });
    return;
  }
  
  const corrections = db.corrections.findByManuscriptId(req.params.id);
  if (corrections.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '该稿件存在关联的更正单，无法删除',
      },
    });
    return;
  }
  
  db.manuscripts.delete(req.params.id);
  
  res.json({
    success: true,
    data: null,
  });
});

export default router;
