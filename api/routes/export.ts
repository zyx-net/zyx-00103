import { Router, type Response } from 'express';
import { db, getCurrentTimestamp } from '../services/database.js';
import { AuthRequest } from '../services/validation.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/json', authMiddleware, roleMiddleware(['admin']), (req: AuthRequest, res: Response): void => {
  const { manuscriptId, dateFrom, dateTo, status, type } = req.query as {
    manuscriptId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    type?: string;
  };

  let manuscripts = db.manuscripts.findAll();
  let corrections = db.corrections.findAll();
  let history = db.history.findAll();

  if (manuscriptId) {
    corrections = corrections.filter(c => c.manuscriptId === manuscriptId);
    const correctionIds = corrections.map(c => c.id);
    history = history.filter(h => correctionIds.includes(h.correctionId));
    manuscripts = manuscripts.filter(m => m.id === manuscriptId);
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    corrections = corrections.filter(c => new Date(c.createdAt) >= fromDate);
    history = history.filter(h => new Date(h.createdAt) >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    corrections = corrections.filter(c => new Date(c.createdAt) <= toDate);
    history = history.filter(h => new Date(h.createdAt) <= toDate);
  }

  if (status) {
    const statusList = status.split(',').map(s => s.trim());
    corrections = corrections.filter(c => statusList.includes(c.status));
    const correctionIds = corrections.map(c => c.id);
    history = history.filter(h => correctionIds.includes(h.correctionId));
  }

  if (type) {
    const typeList = type.split(',').map(t => t.trim());
    corrections = corrections.filter(c => typeList.includes(c.type));
    const correctionIds = corrections.map(c => c.id);
    history = history.filter(h => correctionIds.includes(h.correctionId));
  }

  const data = {
    exportTime: getCurrentTimestamp(),
    exportedBy: req.user?.displayName,
    filters: {
      manuscriptId: manuscriptId || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      status: status ? status.split(',') : null,
      type: type ? type.split(',') : null,
    },
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
  const { manuscriptId, dateFrom, dateTo, status, type } = req.query as {
    manuscriptId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    type?: string;
  };

  let corrections = db.corrections.findAll();

  if (manuscriptId) {
    corrections = corrections.filter(c => c.manuscriptId === manuscriptId);
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    corrections = corrections.filter(c => new Date(c.createdAt) >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    corrections = corrections.filter(c => new Date(c.createdAt) <= toDate);
  }

  if (status) {
    const statusList = status.split(',').map(s => s.trim());
    corrections = corrections.filter(c => statusList.includes(c.status));
  }

  if (type) {
    const typeList = type.split(',').map(t => t.trim());
    corrections = corrections.filter(c => typeList.includes(c.type));
  }

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
      filters: {
        manuscriptId: manuscriptId || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        status: status ? status.split(',') : null,
        type: type ? type.split(',') : null,
      },
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

  const filterParts: string[] = [];
  if (manuscriptId) filterParts.push(`manuscript_${manuscriptId}`);
  if (dateFrom || dateTo) filterParts.push(`${dateFrom || 'start'}_to_${dateTo || 'end'}`);
  if (status) filterParts.push(`status_${status.replace(',', '-')}`);
  if (type) filterParts.push(`type_${type.replace(',', '-')}`);
  const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : '';

  res.setHeader('Content-Type', 'text/csv;charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=corrections${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
  res.send('\ufeff' + csv);
});

export default router;
