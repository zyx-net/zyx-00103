import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'journalist' | 'editor' | 'legal' | 'admin';
  displayName: string;
  createdAt: string;
}

export interface Manuscript {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Correction {
  id: string;
  manuscriptId: string;
  manuscriptTitle: string;
  type: 'factual_error' | 'title_error' | 'source_correction' | 'content_addition' | 'other';
  evidence: string;
  deadline: string;
  impactScope: string;
  hasSourceDispute: boolean;
  status: 'draft' | 'pending_editor' | 'pending_legal' | 'pending_publish' | 'published' | 'rejected';
  creatorId: string;
  creatorName: string;
  currentHandlerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryRecord {
  id: string;
  correctionId: string;
  action: 'create' | 'submit' | 'review_pass' | 'review_reject' | 'legal_confirm' | 'legal_reject' | 'publish' | 'revoke';
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  comment: string;
  previousStatus: string;
  newStatus: string;
  createdAt: string;
}

export interface FilterConfig {
  id: string;
  name: string;
  filters: {
    status?: string[];
    type?: string[];
    dateRange?: { start: string; end: string };
    manuscriptId?: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

function readJsonFile<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

function writeJsonFile<T>(filename: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw error;
  }
}

export const db = {
  users: {
    findAll: (): User[] => readJsonFile<User>('users.json'),
    findById: (id: string): User | undefined => readJsonFile<User>('users.json').find(u => u.id === id),
    findByUsername: (username: string): User | undefined => readJsonFile<User>('users.json').find(u => u.username === username),
  },
  manuscripts: {
    findAll: (): Manuscript[] => readJsonFile<Manuscript>('manuscripts.json'),
    findById: (id: string): Manuscript | undefined => readJsonFile<Manuscript>('manuscripts.json').find(m => m.id === id),
    findByAuthorId: (authorId: string): Manuscript[] => readJsonFile<Manuscript>('manuscripts.json').filter(m => m.authorId === authorId),
    create: (manuscript: Manuscript): Manuscript => {
      const manuscripts = readJsonFile<Manuscript>('manuscripts.json');
      manuscripts.push(manuscript);
      writeJsonFile('manuscripts.json', manuscripts);
      return manuscript;
    },
    update: (id: string, updates: Partial<Manuscript>): Manuscript | undefined => {
      const manuscripts = readJsonFile<Manuscript>('manuscripts.json');
      const index = manuscripts.findIndex(m => m.id === id);
      if (index === -1) return undefined;
      manuscripts[index] = { ...manuscripts[index], ...updates };
      writeJsonFile('manuscripts.json', manuscripts);
      return manuscripts[index];
    },
    delete: (id: string): boolean => {
      const manuscripts = readJsonFile<Manuscript>('manuscripts.json');
      const filtered = manuscripts.filter(m => m.id !== id);
      if (filtered.length === manuscripts.length) return false;
      writeJsonFile('manuscripts.json', filtered);
      return true;
    },
  },
  corrections: {
    findAll: (): Correction[] => readJsonFile<Correction>('corrections.json'),
    findById: (id: string): Correction | undefined => readJsonFile<Correction>('corrections.json').find(c => c.id === id),
    findByManuscriptId: (manuscriptId: string): Correction[] => readJsonFile<Correction>('corrections.json').filter(c => c.manuscriptId === manuscriptId),
    findByCreatorId: (creatorId: string): Correction[] => readJsonFile<Correction>('corrections.json').filter(c => c.creatorId === creatorId),
    create: (correction: Correction): Correction => {
      const corrections = readJsonFile<Correction>('corrections.json');
      corrections.push(correction);
      writeJsonFile('corrections.json', corrections);
      return correction;
    },
    update: (id: string, updates: Partial<Correction>): Correction | undefined => {
      const corrections = readJsonFile<Correction>('corrections.json');
      const index = corrections.findIndex(c => c.id === id);
      if (index === -1) return undefined;
      corrections[index] = { ...corrections[index], ...updates };
      writeJsonFile('corrections.json', corrections);
      return corrections[index];
    },
    hasPublishedCorrection: (manuscriptId: string): boolean => {
      return readJsonFile<Correction>('corrections.json').some(
        c => c.manuscriptId === manuscriptId && c.status === 'published'
      );
    },
  },
  history: {
    findAll: (): HistoryRecord[] => readJsonFile<HistoryRecord>('history.json'),
    findByCorrectionId: (correctionId: string): HistoryRecord[] => 
      readJsonFile<HistoryRecord>('history.json').filter(h => h.correctionId === correctionId),
    create: (record: HistoryRecord): HistoryRecord => {
      const history = readJsonFile<HistoryRecord>('history.json');
      history.push(record);
      writeJsonFile('history.json', history);
      return record;
    },
  },
  configs: {
    findAll: (): FilterConfig[] => readJsonFile<FilterConfig>('configs.json'),
    findById: (id: string): FilterConfig | undefined => readJsonFile<FilterConfig>('configs.json').find(c => c.id === id),
    findByCreatorId: (creatorId: string): FilterConfig[] => readJsonFile<FilterConfig>('configs.json').filter(c => c.createdBy === creatorId),
    create: (config: FilterConfig): FilterConfig => {
      const configs = readJsonFile<FilterConfig>('configs.json');
      configs.push(config);
      writeJsonFile('configs.json', configs);
      return config;
    },
    update: (id: string, updates: Partial<FilterConfig>): FilterConfig | undefined => {
      const configs = readJsonFile<FilterConfig>('configs.json');
      const index = configs.findIndex(c => c.id === id);
      if (index === -1) return undefined;
      configs[index] = { ...configs[index], ...updates };
      writeJsonFile('configs.json', configs);
      return configs[index];
    },
    delete: (id: string): boolean => {
      const configs = readJsonFile<FilterConfig>('configs.json');
      const filtered = configs.filter(c => c.id !== id);
      if (filtered.length === configs.length) return false;
      writeJsonFile('configs.json', filtered);
      return true;
    },
  },
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
