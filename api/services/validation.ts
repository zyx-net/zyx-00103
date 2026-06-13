import { Request } from 'express';
import { db, type User, type Correction } from './database.js';

export interface AuthUser {
  id: string;
  username: string;
  role: 'journalist' | 'editor' | 'legal' | 'admin';
  displayName: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface ValidationError {
  code: string;
  message: string;
  details?: any;
}

export function createError(code: string, message: string, details?: any): ValidationError {
  return { code, message, details };
}

export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    return createError('VALIDATION_ERROR', `请填写${fieldName}`);
  }
  return null;
}

export function validateRole(user: AuthUser, allowedRoles: string[]): ValidationError | null {
  if (!allowedRoles.includes(user.role)) {
    const roleNames: Record<string, string> = {
      journalist: '记者',
      editor: '编辑',
      legal: '法务',
      admin: '管理员',
    };
    return createError('FORBIDDEN', `${roleNames[user.role] || user.role}无权执行此操作`);
  }
  return null;
}

export function validateCorrectionForSubmit(correction: Correction): ValidationError | null {
  const errors: string[] = [];
  
  if (!correction.evidence || correction.evidence.trim() === '') {
    errors.push('证据说明');
  }
  if (!correction.deadline || correction.deadline.trim() === '') {
    errors.push('截止时间');
  }
  if (!correction.impactScope || correction.impactScope.trim() === '') {
    errors.push('影响范围');
  }
  
  if (errors.length > 0) {
    return createError('VALIDATION_ERROR', `请填写${errors.join('、')}`, { missingFields: errors });
  }
  
  return null;
}

export function validateStatusTransition(
  currentStatus: Correction['status'],
  targetStatus: Correction['status']
): boolean {
  const validTransitions: Record<string, string[]> = {
    draft: ['pending_editor'],
    pending_editor: ['pending_legal', 'rejected'],
    pending_legal: ['pending_publish', 'rejected'],
    pending_publish: ['published', 'rejected'],
    published: ['pending_publish'],
    rejected: ['pending_editor'],
  };
  
  return validTransitions[currentStatus]?.includes(targetStatus) || false;
}

export function validateNoDuplicatePublish(manuscriptId: string, excludeCorrectionId?: string): ValidationError | null {
  const corrections = db.corrections.findByManuscriptId(manuscriptId);
  const hasPublished = corrections.some(
    c => c.status === 'published' && c.id !== excludeCorrectionId
  );
  
  if (hasPublished) {
    return createError('DUPLICATE_PUBLISH', '该稿件已发布更正，不可重复发布');
  }
  
  return null;
}

export function validateSourceDisputeHandled(correction: Correction): ValidationError | null {
  if (correction.hasSourceDispute && correction.status === 'pending_publish') {
    const history = db.history.findByCorrectionId(correction.id);
    const hasLegalConfirm = history.some(h => h.action === 'legal_confirm');
    
    if (!hasLegalConfirm) {
      return createError('SOURCE_DISPUTE', '来源争议必须经过法务确认');
    }
  }
  
  return null;
}
