import { Router, type Response } from 'express';
import { db, generateId, getCurrentTimestamp, type Correction, type HistoryRecord } from '../services/database.js';
import { AuthRequest, validateCorrectionForSubmit, validateNoDuplicatePublish } from '../services/validation.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

const statusConfig: Record<string, { label: string }> = {
  draft: { label: '草稿' },
  pending_editor: { label: '待编辑复核' },
  pending_legal: { label: '待法务确认' },
  pending_publish: { label: '待发布' },
  published: { label: '已发布' },
  rejected: { label: '已退回' },
};

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const corrections = db.corrections.findAll();
  const user = req.user!;
  
  let filteredCorrections = corrections;
  if (user.role === 'journalist') {
    filteredCorrections = corrections.filter(c => c.creatorId === user.id);
  }
  
  const status = req.query.status as string;
  if (status) {
    const statusList = status.split(',');
    filteredCorrections = filteredCorrections.filter(c => statusList.includes(c.status));
  }
  
  res.json({
    success: true,
    data: filteredCorrections,
  });
});

router.post('/', authMiddleware, roleMiddleware(['journalist']), (req: AuthRequest, res: Response): void => {
  const { manuscriptId, type, evidence, deadline, impactScope, hasSourceDispute } = req.body;
  const user = req.user!;
  
  if (!manuscriptId) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择稿件' },
    });
    return;
  }
  
  const manuscript = db.manuscripts.findById(manuscriptId);
  if (!manuscript) {
    res.status(400).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '稿件不存在' },
    });
    return;
  }
  
  const validTypes = ['factual_error', 'title_error', 'source_correction', 'content_addition', 'other'];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择正确的更正类型' },
    });
    return;
  }
  
  const now = getCurrentTimestamp();
  const correction: Correction = {
    id: generateId(),
    manuscriptId,
    manuscriptTitle: manuscript.title,
    type,
    evidence: evidence?.trim() || '',
    deadline: deadline || '',
    impactScope: impactScope?.trim() || '',
    hasSourceDispute: Boolean(hasSourceDispute),
    status: 'draft',
    creatorId: user.id,
    creatorName: user.displayName,
    currentHandlerId: null,
    createdAt: now,
    updatedAt: now,
  };
  
  db.corrections.create(correction);
  
  const historyRecord: HistoryRecord = {
    id: generateId(),
    correctionId: correction.id,
    action: 'create',
    operatorId: user.id,
    operatorName: user.displayName,
    operatorRole: user.role,
    comment: '创建更正单',
    previousStatus: '',
    newStatus: 'draft',
    createdAt: now,
  };
  db.history.create(historyRecord);
  
  res.status(201).json({
    success: true,
    data: correction,
  });
});

interface BatchResultItem {
  id: string;
  success: boolean;
  message: string;
  reason?: string;
}

router.post('/batch/review', authMiddleware, roleMiddleware(['editor']), (req: AuthRequest, res: Response): void => {
  const { ids, action, comment } = req.body;
  const user = req.user!;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择要操作的更正单' },
    });
    return;
  }
  
  if (!action || !['pass', 'reject'].includes(action)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择通过或退回' },
    });
    return;
  }
  
  if (action === 'reject' && (!comment || comment.trim() === '')) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请填写退回原因' },
    });
    return;
  }
  
  const results: BatchResultItem[] = [];
  const now = getCurrentTimestamp();
  
  for (const id of ids) {
    const correction = db.corrections.findById(id);
    
    if (!correction) {
      results.push({ id, success: false, message: '跳过', reason: '更正单不存在' });
      continue;
    }
    
    if (correction.status === 'published') {
      results.push({ id, success: false, message: '跳过', reason: '已发布的更正单不能批量操作' });
      continue;
    }
    
    if (correction.status === 'rejected') {
      results.push({ id, success: false, message: '跳过', reason: '已退回的更正单不能批量操作' });
      continue;
    }
    
    if (correction.status !== 'pending_editor') {
      results.push({ id, success: false, message: '跳过', reason: `当前状态(${statusConfig[correction.status]?.label || correction.status})不允许复核` });
      continue;
    }
    
    try {
      const previousStatus = correction.status;
      const newStatus = action === 'pass' ? 'pending_legal' : 'rejected';
      const nextHandler = action === 'pass' ? '3' : correction.creatorId;
      
      db.corrections.update(id, {
        status: newStatus,
        currentHandlerId: nextHandler,
        updatedAt: now,
      });
      
      const historyRecord: HistoryRecord = {
        id: generateId(),
        correctionId: id,
        action: action === 'pass' ? 'review_pass' : 'review_reject',
        operatorId: user.id,
        operatorName: user.displayName,
        operatorRole: user.role,
        comment: comment || (action === 'pass' ? '批量复核通过' : '批量退回'),
        previousStatus,
        newStatus,
        createdAt: now,
      };
      db.history.create(historyRecord);
      
      results.push({ id, success: true, message: action === 'pass' ? '复核通过' : '已退回' });
    } catch (e) {
      results.push({ id, success: false, message: '失败', reason: (e as Error).message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const skipCount = results.filter(r => !r.success && r.message === '跳过').length;
  const failCount = results.filter(r => !r.success && r.message === '失败').length;
  
  res.json({
    success: successCount > 0,
    data: results,
    summary: {
      total: ids.length,
      success: successCount,
      skipped: skipCount,
      failed: failCount,
    },
  });
});

router.post('/batch/legal', authMiddleware, roleMiddleware(['legal']), (req: AuthRequest, res: Response): void => {
  const { ids, action, comment } = req.body;
  const user = req.user!;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择要操作的更正单' },
    });
    return;
  }
  
  if (!action || !['confirm', 'reject'].includes(action)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择确认或退回' },
    });
    return;
  }
  
  if (action === 'reject' && (!comment || comment.trim() === '')) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请填写退回原因' },
    });
    return;
  }
  
  const results: BatchResultItem[] = [];
  const now = getCurrentTimestamp();
  
  for (const id of ids) {
    const correction = db.corrections.findById(id);
    
    if (!correction) {
      results.push({ id, success: false, message: '跳过', reason: '更正单不存在' });
      continue;
    }
    
    if (correction.status === 'published') {
      results.push({ id, success: false, message: '跳过', reason: '已发布的更正单不能批量操作' });
      continue;
    }
    
    if (correction.status === 'rejected') {
      results.push({ id, success: false, message: '跳过', reason: '已退回的更正单不能批量操作' });
      continue;
    }
    
    if (correction.status !== 'pending_legal') {
      results.push({ id, success: false, message: '跳过', reason: `当前状态(${statusConfig[correction.status]?.label || correction.status})不允许法务确认` });
      continue;
    }
    
    try {
      const previousStatus = correction.status;
      const newStatus = action === 'confirm' ? 'pending_publish' : 'rejected';
      const nextHandler = action === 'confirm' ? '4' : correction.creatorId;
      
      db.corrections.update(id, {
        status: newStatus,
        currentHandlerId: nextHandler,
        updatedAt: now,
      });
      
      const historyRecord: HistoryRecord = {
        id: generateId(),
        correctionId: id,
        action: action === 'confirm' ? 'legal_confirm' : 'legal_reject',
        operatorId: user.id,
        operatorName: user.displayName,
        operatorRole: user.role,
        comment: comment || (action === 'confirm' ? '批量法务确认通过' : '批量法务退回'),
        previousStatus,
        newStatus,
        createdAt: now,
      };
      db.history.create(historyRecord);
      
      results.push({ id, success: true, message: action === 'confirm' ? '确认通过' : '已退回' });
    } catch (e) {
      results.push({ id, success: false, message: '失败', reason: (e as Error).message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const skipCount = results.filter(r => !r.success && r.message === '跳过').length;
  const failCount = results.filter(r => !r.success && r.message === '失败').length;
  
  res.json({
    success: successCount > 0,
    data: results,
    summary: {
      total: ids.length,
      success: successCount,
      skipped: skipCount,
      failed: failCount,
    },
  });
});

router.post('/batch/publish', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const { ids, comment } = req.body;
  const user = req.user!;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择要操作的更正单' },
    });
    return;
  }
  
  const results: BatchResultItem[] = [];
  const now = getCurrentTimestamp();
  
  for (const id of ids) {
    const correction = db.corrections.findById(id);
    
    if (!correction) {
      results.push({ id, success: false, message: '跳过', reason: '更正单不存在' });
      continue;
    }
    
    if (correction.status === 'published') {
      results.push({ id, success: false, message: '跳过', reason: '已发布的更正单不能重复发布' });
      continue;
    }
    
    if (correction.status === 'rejected') {
      results.push({ id, success: false, message: '跳过', reason: '已退回的更正单不能批量操作' });
      continue;
    }
    
    if (correction.status !== 'pending_publish') {
      results.push({ id, success: false, message: '跳过', reason: `当前状态(${statusConfig[correction.status]?.label || correction.status})不允许发布` });
      continue;
    }
    
    if (correction.hasSourceDispute) {
      const history = db.history.findByCorrectionId(id);
      const hasLegalConfirm = history.some(h => h.action === 'legal_confirm');
      if (!hasLegalConfirm) {
        results.push({ id, success: false, message: '跳过', reason: '来源争议必须经过法务确认' });
        continue;
      }
    }
    
    const duplicateError = validateNoDuplicatePublish(correction.manuscriptId, id);
    if (duplicateError) {
      results.push({ id, success: false, message: '跳过', reason: duplicateError.message });
      continue;
    }
    
    try {
      const previousStatus = correction.status;
      
      db.corrections.update(id, {
        status: 'published',
        currentHandlerId: null,
        updatedAt: now,
      });
      
      const historyRecord: HistoryRecord = {
        id: generateId(),
        correctionId: id,
        action: 'publish',
        operatorId: user.id,
        operatorName: user.displayName,
        operatorRole: user.role,
        comment: comment || '批量发布更正',
        previousStatus,
        newStatus: 'published',
        createdAt: now,
      };
      db.history.create(historyRecord);
      
      results.push({ id, success: true, message: '已发布' });
    } catch (e) {
      results.push({ id, success: false, message: '失败', reason: (e as Error).message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const skipCount = results.filter(r => !r.success && r.message === '跳过').length;
  const failCount = results.filter(r => !r.success && r.message === '失败').length;
  
  res.json({
    success: successCount > 0,
    data: results,
    summary: {
      total: ids.length,
      success: successCount,
      skipped: skipCount,
      failed: failCount,
    },
  });
});

router.post('/batch/revoke', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const { ids, comment } = req.body;
  const user = req.user!;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择要操作的更正单' },
    });
    return;
  }
  
  const results: BatchResultItem[] = [];
  const now = getCurrentTimestamp();
  
  for (const id of ids) {
    const correction = db.corrections.findById(id);
    
    if (!correction) {
      results.push({ id, success: false, message: '跳过', reason: '更正单不存在' });
      continue;
    }
    
    if (correction.status !== 'published') {
      results.push({ id, success: false, message: '跳过', reason: `当前状态(${statusConfig[correction.status]?.label || correction.status})不允许撤销` });
      continue;
    }
    
    try {
      const previousStatus = correction.status;
      
      db.corrections.update(id, {
        status: 'pending_publish',
        currentHandlerId: user.id,
        updatedAt: now,
      });
      
      const historyRecord: HistoryRecord = {
        id: generateId(),
        correctionId: id,
        action: 'revoke',
        operatorId: user.id,
        operatorName: user.displayName,
        operatorRole: user.role,
        comment: comment || '批量撤销发布',
        previousStatus,
        newStatus: 'pending_publish',
        createdAt: now,
      };
      db.history.create(historyRecord);
      
      results.push({ id, success: true, message: '已撤销' });
    } catch (e) {
      results.push({ id, success: false, message: '失败', reason: (e as Error).message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const skipCount = results.filter(r => !r.success && r.message === '跳过').length;
  const failCount = results.filter(r => !r.success && r.message === '失败').length;
  
  res.json({
    success: successCount > 0,
    data: results,
    summary: {
      total: ids.length,
      success: successCount,
      skipped: skipCount,
      failed: failCount,
    },
  });
});

router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '更正单不存在',
      },
    });
    return;
  }
  
  const user = req.user!;
  if (user.role === 'journalist' && correction.creatorId !== user.id) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '无权查看此更正单',
      },
    });
    return;
  }
  
  const history = db.history.findByCorrectionId(req.params.id);
  
  res.json({
    success: true,
    data: {
      ...correction,
      history,
    },
  });
});

router.put('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  const user = req.user!;
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '更正单不存在' },
    });
    return;
  }
  
  if (user.role === 'journalist' && correction.creatorId !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '无权修改此更正单' },
    });
    return;
  }
  
  if (correction.status !== 'draft' && correction.status !== 'rejected') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: '当前状态不允许修改' },
    });
    return;
  }
  
  const { type, evidence, deadline, impactScope, hasSourceDispute } = req.body;
  const updates: Partial<Correction> = {
    updatedAt: getCurrentTimestamp(),
  };
  
  if (type !== undefined) updates.type = type;
  if (evidence !== undefined) updates.evidence = evidence.trim();
  if (deadline !== undefined) updates.deadline = deadline;
  if (impactScope !== undefined) updates.impactScope = impactScope.trim();
  if (hasSourceDispute !== undefined) updates.hasSourceDispute = Boolean(hasSourceDispute);
  
  const updated = db.corrections.update(req.params.id, updates);
  
  res.json({
    success: true,
    data: updated,
  });
});

router.post('/:id/submit', authMiddleware, roleMiddleware(['journalist']), (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  const user = req.user!;
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '更正单不存在' },
    });
    return;
  }
  
  if (correction.creatorId !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '无权操作此更正单' },
    });
    return;
  }
  
  if (correction.status !== 'draft' && correction.status !== 'rejected') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: '当前状态不允许提交' },
    });
    return;
  }
  
  const validationError = validateCorrectionForSubmit(correction);
  if (validationError) {
    res.status(400).json({
      success: false,
      error: validationError,
    });
    return;
  }
  
  const previousStatus = correction.status;
  const now = getCurrentTimestamp();
  
  const updated = db.corrections.update(req.params.id, {
    status: 'pending_editor',
    currentHandlerId: '2',
    updatedAt: now,
  });
  
  const historyRecord: HistoryRecord = {
    id: generateId(),
    correctionId: correction.id,
    action: 'submit',
    operatorId: user.id,
    operatorName: user.displayName,
    operatorRole: user.role,
    comment: req.body.comment || '提交更正单',
    previousStatus,
    newStatus: 'pending_editor',
    createdAt: now,
  };
  db.history.create(historyRecord);
  
  res.json({
    success: true,
    data: updated,
  });
});

router.post('/:id/review', authMiddleware, roleMiddleware(['editor']), (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  const user = req.user!;
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '更正单不存在' },
    });
    return;
  }
  
  if (correction.status !== 'pending_editor') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: '当前状态不允许复核' },
    });
    return;
  }
  
  const { action, comment } = req.body;
  if (!action || !['pass', 'reject'].includes(action)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择通过或退回' },
    });
    return;
  }
  
  if (action === 'reject' && (!comment || comment.trim() === '')) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请填写退回原因' },
    });
    return;
  }
  
  const previousStatus = correction.status;
  const now = getCurrentTimestamp();
  const newStatus = action === 'pass' ? 'pending_legal' : 'rejected';
  const nextHandler = action === 'pass' ? '3' : correction.creatorId;
  
  const updated = db.corrections.update(req.params.id, {
    status: newStatus,
    currentHandlerId: nextHandler,
    updatedAt: now,
  });
  
  const historyRecord: HistoryRecord = {
    id: generateId(),
    correctionId: correction.id,
    action: action === 'pass' ? 'review_pass' : 'review_reject',
    operatorId: user.id,
    operatorName: user.displayName,
    operatorRole: user.role,
    comment: comment || (action === 'pass' ? '复核通过' : '退回修改'),
    previousStatus,
    newStatus,
    createdAt: now,
  };
  db.history.create(historyRecord);
  
  res.json({
    success: true,
    data: updated,
  });
});

router.post('/:id/legal', authMiddleware, roleMiddleware(['legal']), (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  const user = req.user!;
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '更正单不存在' },
    });
    return;
  }
  
  if (correction.status !== 'pending_legal') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: '当前状态不允许法务确认' },
    });
    return;
  }
  
  const { action, comment } = req.body;
  if (!action || !['confirm', 'reject'].includes(action)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择确认或退回' },
    });
    return;
  }
  
  if (action === 'reject' && (!comment || comment.trim() === '')) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请填写退回原因' },
    });
    return;
  }
  
  const previousStatus = correction.status;
  const now = getCurrentTimestamp();
  const newStatus = action === 'confirm' ? 'pending_publish' : 'rejected';
  const nextHandler = action === 'confirm' ? '4' : correction.creatorId;
  
  const updated = db.corrections.update(req.params.id, {
    status: newStatus,
    currentHandlerId: nextHandler,
    updatedAt: now,
  });
  
  const historyRecord: HistoryRecord = {
    id: generateId(),
    correctionId: correction.id,
    action: action === 'confirm' ? 'legal_confirm' : 'legal_reject',
    operatorId: user.id,
    operatorName: user.displayName,
    operatorRole: user.role,
    comment: comment || (action === 'confirm' ? '法务确认通过' : '法务退回'),
    previousStatus,
    newStatus,
    createdAt: now,
  };
  db.history.create(historyRecord);
  
  res.json({
    success: true,
    data: updated,
  });
});

router.post('/:id/publish', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  const user = req.user!;
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '更正单不存在' },
    });
    return;
  }
  
  if (correction.status !== 'pending_publish') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: '当前状态不允许发布' },
    });
    return;
  }
  
  if (correction.hasSourceDispute) {
    const history = db.history.findByCorrectionId(correction.id);
    const hasLegalConfirm = history.some(h => h.action === 'legal_confirm');
    if (!hasLegalConfirm) {
      res.status(400).json({
        success: false,
        error: { code: 'SOURCE_DISPUTE', message: '来源争议必须经过法务确认' },
      });
      return;
    }
  }
  
  const duplicateError = validateNoDuplicatePublish(correction.manuscriptId, correction.id);
  if (duplicateError) {
    res.status(400).json({
      success: false,
      error: duplicateError,
    });
    return;
  }
  
  const previousStatus = correction.status;
  const now = getCurrentTimestamp();
  
  const updated = db.corrections.update(req.params.id, {
    status: 'published',
    currentHandlerId: null,
    updatedAt: now,
  });
  
  const historyRecord: HistoryRecord = {
    id: generateId(),
    correctionId: correction.id,
    action: 'publish',
    operatorId: user.id,
    operatorName: user.displayName,
    operatorRole: user.role,
    comment: req.body.comment || '发布更正',
    previousStatus,
    newStatus: 'published',
    createdAt: now,
  };
  db.history.create(historyRecord);
  
  res.json({
    success: true,
    data: updated,
  });
});

router.post('/:id/revoke', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  const user = req.user!;
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '更正单不存在' },
    });
    return;
  }
  
  if (correction.status !== 'published') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: '只能撤销已发布的更正' },
    });
    return;
  }
  
  const previousStatus = correction.status;
  const now = getCurrentTimestamp();
  
  const updated = db.corrections.update(req.params.id, {
    status: 'pending_publish',
    currentHandlerId: user.id,
    updatedAt: now,
  });
  
  const historyRecord: HistoryRecord = {
    id: generateId(),
    correctionId: correction.id,
    action: 'revoke',
    operatorId: user.id,
    operatorName: user.displayName,
    operatorRole: user.role,
    comment: req.body.comment || '撤销发布',
    previousStatus,
    newStatus: 'pending_publish',
    createdAt: now,
  };
  db.history.create(historyRecord);
  
  res.json({
    success: true,
    data: updated,
  });
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const correction = db.corrections.findById(req.params.id);
  const user = req.user!;
  
  if (!correction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '更正单不存在' },
    });
    return;
  }
  
  if (user.role === 'journalist' && correction.creatorId !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '无权删除此更正单' },
    });
    return;
  }
  
  if (correction.status === 'published') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '已发布的更正只能撤销，不能删除' },
    });
    return;
  }
  
  res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: '更正单不可直接删除，请联系管理员' },
  });
});

export default router;
