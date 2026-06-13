const API_BASE = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '网络请求失败，请检查连接',
      },
    };
  }
}

export interface User {
  id: string;
  username: string;
  role: 'journalist' | 'editor' | 'legal' | 'admin';
  displayName: string;
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
  history?: HistoryRecord[];
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

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ id: string; username: string; role: string; displayName: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request<User>('/auth/me'),
  },

  manuscripts: {
    list: () => request<Manuscript[]>('/manuscripts'),
    get: (id: string) => request<Manuscript>(`/manuscripts/${id}`),
    create: (data: Partial<Manuscript>) =>
      request<Manuscript>('/manuscripts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Manuscript>) =>
      request<Manuscript>(`/manuscripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/manuscripts/${id}`, {
        method: 'DELETE',
      }),
  },

  corrections: {
    list: (status?: string) =>
      request<Correction[]>(`/corrections${status ? `?status=${status}` : ''}`),
    get: (id: string) => request<Correction>(`/corrections/${id}`),
    create: (data: Partial<Correction>) =>
      request<Correction>('/corrections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Correction>) =>
      request<Correction>(`/corrections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    submit: (id: string, comment?: string) =>
      request<Correction>(`/corrections/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
    review: (id: string, action: 'pass' | 'reject', comment?: string) =>
      request<Correction>(`/corrections/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      }),
    legal: (id: string, action: 'confirm' | 'reject', comment?: string) =>
      request<Correction>(`/corrections/${id}/legal`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      }),
    publish: (id: string, comment?: string) =>
      request<Correction>(`/corrections/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
    revoke: (id: string, comment?: string) =>
      request<Correction>(`/corrections/${id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
  },

  history: {
    list: (params?: { manuscriptId?: string; correctionId?: string; dateFrom?: string; dateTo?: string }) => {
      const query = new URLSearchParams();
      if (params?.manuscriptId) query.append('manuscriptId', params.manuscriptId);
      if (params?.correctionId) query.append('correctionId', params.correctionId);
      if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
      if (params?.dateTo) query.append('dateTo', params.dateTo);
      const queryStr = query.toString();
      return request<HistoryRecord[]>(`/history${queryStr ? `?${queryStr}` : ''}`);
    },
  },

  export: {
    json: (params?: { manuscriptId?: string; dateFrom?: string; dateTo?: string; status?: string; type?: string }) => {
      const query = new URLSearchParams();
      if (params?.manuscriptId) query.append('manuscriptId', params.manuscriptId);
      if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
      if (params?.dateTo) query.append('dateTo', params.dateTo);
      if (params?.status) query.append('status', params.status);
      if (params?.type) query.append('type', params.type);
      const queryStr = query.toString();
      return `${API_BASE}/export/json${queryStr ? `?${queryStr}` : ''}`;
    },
    csv: (params?: { manuscriptId?: string; dateFrom?: string; dateTo?: string; status?: string; type?: string }) => {
      const query = new URLSearchParams();
      if (params?.manuscriptId) query.append('manuscriptId', params.manuscriptId);
      if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
      if (params?.dateTo) query.append('dateTo', params.dateTo);
      if (params?.status) query.append('status', params.status);
      if (params?.type) query.append('type', params.type);
      const queryStr = query.toString();
      return `${API_BASE}/export/csv${queryStr ? `?${queryStr}` : ''}`;
    },
  },

  configs: {
    list: () => request<FilterConfig[]>('/configs'),
    create: (data: Partial<FilterConfig>) =>
      request<FilterConfig>('/configs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<FilterConfig>) =>
      request<FilterConfig>(`/configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/configs/${id}`, {
        method: 'DELETE',
      }),
  },
};
