import { Router, type Response } from 'express';
import { db, generateId, getCurrentTimestamp, type FilterConfig } from '../services/database.js';
import { AuthRequest } from '../services/validation.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/json', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const manuscripts = db.manuscripts.findAll();
  const corrections = db.corrections.findAll();
  const history = db.history.findAll();
  
  const data = {
    exportTime: getCurrentTimestamp(),
    exportedBy: req.user?.displayName,
    manuscripts,
    corrections,
    history,
  };
  
  res.json({
    success: true,
    data,
  });
});

router.get('/csv', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const corrections = db.corrections.findAll();
  const manuscripts = db.manuscripts.findAll();
  
  const statusMap: Record<string, string> = {
    draft: '草稿',
    pending_editor: '待编辑复核',
    pending_legal: '待法务确认',
    pending_publish: '待发布',
    published: '已发布',
    rejected: '已退回',
  };
  
  const typeMap: Record<string, string> = {
    factual_error: '事实错误',
    title_error: '标题错误',
    source_correction: '来源更正',
    content_addition: '内容补充',
    other: '其他',
  };
  
  const rows = corrections.map(c => {
    const manuscript = manuscripts.find(m => m.id === c.manuscriptId);
    return {
      更正单ID: c.id,
      稿件ID: c.manuscriptId,
      稿件标题: c.manuscriptTitle,
      更正类型: typeMap[c.type] || c.type,
      证据说明: c.evidence,
      截止时间: c.deadline,
      影响范围: c.impactScope,
      来源争议: c.hasSourceDispute ? '是' : '否',
      状态: statusMap[c.status] || c.status,
      创建人: c.creatorName,
      创建时间: new Date(c.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(c.updatedAt).toLocaleString('zh-CN'),
    };
  });
  
  if (rows.length === 0) {
    res.json({
      success: true,
      data: [],
    });
    return;
  }
  
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(h => {
        const val = String(row[h as keyof typeof row] || '');
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];
  
  const csv = csvRows.join('\n');
  
  res.setHeader('Content-Type', 'text/csv;charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=corrections_${new Date().toISOString().split('T')[0]}.csv`);
  res.send('\ufeff' + csv);
});

export default router;
