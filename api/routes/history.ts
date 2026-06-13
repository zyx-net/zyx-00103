import { Router, type Response } from 'express';
import { db } from '../services/database.js';
import { AuthRequest } from '../services/validation.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const history = db.history.findAll();
  
  const manuscriptId = req.query.manuscriptId as string;
  const correctionId = req.query.correctionId as string;
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;
  
  let filteredHistory = history;
  
  if (correctionId) {
    filteredHistory = filteredHistory.filter(h => h.correctionId === correctionId);
  }
  
  if (manuscriptId) {
    const corrections = db.corrections.findByManuscriptId(manuscriptId);
    const correctionIds = corrections.map(c => c.id);
    filteredHistory = filteredHistory.filter(h => correctionIds.includes(h.correctionId));
  }
  
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    filteredHistory = filteredHistory.filter(h => new Date(h.createdAt) >= fromDate);
  }
  
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredHistory = filteredHistory.filter(h => new Date(h.createdAt) <= toDate);
  }
  
  filteredHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json({
    success: true,
    data: filteredHistory,
  });
});

export default router;
