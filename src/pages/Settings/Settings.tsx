import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { api, FilterConfig } from '../../services/api';
import { FileJson, FileSpreadsheet, Trash2, AlertCircle, Filter, Check, X, Save, Play } from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const { manuscripts, fetchManuscripts } = useDataStore();
  const [configs, setConfigs] = useState<FilterConfig[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [filterManuscriptId, setFilterManuscriptId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);

  useEffect(() => {
    fetchConfigs();
    fetchManuscripts();
  }, []);

  const fetchConfigs = async () => {
    const response = await api.configs.list();
    if (response.success && response.data) {
      setConfigs(response.data as FilterConfig[]);
    }
  };

  const getCurrentFilters = () => {
    const filters: FilterConfig['filters'] = {};
    if (filterManuscriptId) filters.manuscriptId = filterManuscriptId;
    if (filterDateFrom || filterDateTo) {
      filters.dateRange = {
        start: filterDateFrom,
        end: filterDateTo,
      };
    }
    if (filterStatus.length > 0) filters.status = filterStatus;
    if (filterType.length > 0) filters.type = filterType;
    return filters;
  };

  const applyFilters = (filters: FilterConfig['filters']) => {
    setFilterManuscriptId(filters.manuscriptId || '');
    setFilterDateFrom(filters.dateRange?.start || '');
    setFilterDateTo(filters.dateRange?.end || '');
    setFilterStatus(filters.status || []);
    setFilterType(filters.type || []);
  };

  const handleCreateConfig = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError('配置名称不能为空');
      return;
    }

    setLoading(true);
    setError(null);

    const filters = getCurrentFilters();
    const response = await api.configs.create({ name: trimmedName, filters });

    if (response.success) {
      const resultData = response as { success: boolean; data?: FilterConfig; action?: string };
      const action = resultData.action;
      setSuccess(action === 'updated' ? `配置"${trimmedName}"已覆盖更新` : `配置"${trimmedName}"创建成功`);
      await fetchConfigs();
      setShowCreateModal(false);
      setNewName('');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(response.error?.message || '保存配置失败');
    }
    setLoading(false);
  };

  const handleDeleteConfig = async (id: string, name: string) => {
    const response = await api.configs.delete(id);
    if (response.success) {
      setSuccess(`配置"${name}"已删除`);
      await fetchConfigs();
      setDeleteConfirm(null);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(response.error?.message || '删除配置失败');
    }
  };

  const handleExport = async (type: 'json' | 'csv') => {
    setExportLoading(true);
    setError(null);

    const params: { manuscriptId?: string; dateFrom?: string; dateTo?: string; status?: string; type?: string } = {};
    if (filterManuscriptId) params.manuscriptId = filterManuscriptId;
    if (filterDateFrom) params.dateFrom = filterDateFrom;
    if (filterDateTo) params.dateTo = filterDateTo;
    if (filterStatus.length > 0) params.status = filterStatus.join(',');
    if (filterType.length > 0) params.type = filterType.join(',');

    try {
      if (type === 'json') {
        const token = localStorage.getItem('token');
        const response = await fetch(api.export.json(params), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `corrections_export_${new Date().toISOString().split('T')[0]}.json`);
      } else {
        const token = localStorage.getItem('token');
        const url = api.export.csv(params);
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, `corrections_export_${new Date().toISOString().split('T')[0]}.csv`);
      }
    } catch {
      setError('导出失败');
    }

    setExportLoading(false);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilterManuscriptId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterStatus([]);
    setFilterType([]);
  };

  const hasFilters = filterManuscriptId || filterDateFrom || filterDateTo || filterStatus.length > 0 || filterType.length > 0;

  const getFilterPreview = (filters: FilterConfig['filters']) => {
    const parts: string[] = [];
    if (filters.manuscriptId) {
      const manuscript = manuscripts.find(m => m.id === filters.manuscriptId);
      parts.push(`稿件: ${manuscript?.title || filters.manuscriptId}`);
    }
    if (filters.dateRange) {
      if (filters.dateRange.start || filters.dateRange.end) {
        const start = filters.dateRange.start || '开始';
        const end = filters.dateRange.end || '结束';
        parts.push(`日期: ${start} ~ ${end}`);
      }
    }
    if (filters.status && filters.status.length > 0) {
      const statusNames: Record<string, string> = {
        draft: '草稿',
        pending_editor: '待编辑复核',
        pending_legal: '待法务确认',
        pending_publish: '待发布',
        published: '已发布',
        rejected: '已退回',
      };
      parts.push(`状态: ${filters.status.map(s => statusNames[s] || s).join(', ')}`);
    }
    if (filters.type && filters.type.length > 0) {
      const typeNames: Record<string, string> = {
        factual_error: '事实错误',
        title_error: '标题错误',
        source_correction: '来源更正',
        content_addition: '内容补充',
        other: '其他',
      };
      parts.push(`类型: ${filters.type.map(t => typeNames[t] || t).join(', ')}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '无筛选条件';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-2 text-red-400" size={32} />
        <p className="text-gray-400">您没有权限访问此页面</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">配置管理</h1>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
          <X size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2">
          <Check size={18} />
          {success}
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">数据导出</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          可按稿件、日期范围或状态筛选导出数据，不设置筛选条件则导出全部数据
        </p>

        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Filter size={16} />
            <span>筛选条件</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-orange-400 hover:text-orange-300 text-xs flex items-center gap-1"
              >
                <X size={14} />
                清除筛选
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">按稿件筛选</label>
              <select
                value={filterManuscriptId}
                onChange={(e) => setFilterManuscriptId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
              >
                <option value="">全部稿件</option>
                {manuscripts.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">按状态筛选</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'draft', label: '草稿' },
                { value: 'pending_editor', label: '待编辑复核' },
                { value: 'pending_legal', label: '待法务确认' },
                { value: 'pending_publish', label: '待发布' },
                { value: 'published', label: '已发布' },
                { value: 'rejected', label: '已退回' },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    setFilterStatus(prev =>
                      prev.includes(status.value)
                        ? prev.filter(s => s !== status.value)
                        : [...prev, status.value]
                    );
                  }}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filterStatus.includes(status.value)
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">按类型筛选</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'factual_error', label: '事实错误' },
                { value: 'title_error', label: '标题错误' },
                { value: 'source_correction', label: '来源更正' },
                { value: 'content_addition', label: '内容补充' },
                { value: 'other', label: '其他' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setFilterType(prev =>
                      prev.includes(type.value)
                        ? prev.filter(t => t !== type.value)
                        : [...prev, type.value]
                    );
                  }}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filterType.includes(type.value)
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
              当前筛选：
              {filterManuscriptId && (
                <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                  稿件: {manuscripts.find(m => m.id === filterManuscriptId)?.title || filterManuscriptId}
                </span>
              )}
              {filterDateFrom && (
                <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
                  从: {filterDateFrom}
                </span>
              )}
              {filterDateTo && (
                <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
                  到: {filterDateTo}
                </span>
              )}
              {filterStatus.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                  状态: {filterStatus.length}项
                </span>
              )}
              {filterType.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">
                  类型: {filterType.length}项
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleExport('json')}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            <FileJson size={18} />
            导出 JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            <FileSpreadsheet size={18} />
            导出 CSV
          </button>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">筛选配置预设</h2>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setNewName('');
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={16} />
            保存当前筛选为预设
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          保存筛选配置预设，方便一键应用到导出区域。同名预设会自动覆盖。
        </p>

        {configs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无筛选配置预设</p>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{config.name}</p>
                    {config.updatedAt && (
                      <span className="text-xs text-gray-500">(已更新)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    筛选条件: {getFilterPreview(config.filters)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    创建于 {new Date(config.createdAt).toLocaleDateString('zh-CN')}
                    {config.updatedAt && ` | 更新于 ${new Date(config.updatedAt).toLocaleDateString('zh-CN')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => applyFilters(config.filters)}
                    className="p-2 hover:bg-green-500/20 rounded-lg transition-colors text-green-400"
                    title="应用此预设"
                  >
                    <Play size={18} />
                  </button>
                  {deleteConfirm === config.id ? (
                    <>
                      <button
                        onClick={() => handleDeleteConfig(config.id, config.name)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400"
                        title="确认删除"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
                        title="取消删除"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(config.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="删除此预设"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">保存筛选配置预设</h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="请输入预设名称"
                autoFocus
              />
              {hasFilters ? (
                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg text-sm text-gray-400">
                  <p className="font-medium text-orange-400 mb-2">将保存以下筛选条件：</p>
                  <div className="space-y-1">
                    {filterManuscriptId && (
                      <p>• 稿件: {manuscripts.find(m => m.id === filterManuscriptId)?.title || filterManuscriptId}</p>
                    )}
                    {(filterDateFrom || filterDateTo) && (
                      <p>• 日期: {filterDateFrom || '开始'} ~ {filterDateTo || '结束'}</p>
                    )}
                    {filterStatus.length > 0 && (
                      <p>• 状态: {filterStatus.join(', ')}</p>
                    )}
                    {filterType.length > 0 && (
                      <p>• 类型: {filterType.join(', ')}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg text-sm text-gray-500">
                  当前无筛选条件，将保存为空预设
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                同名预设将自动覆盖
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateConfig}
                disabled={loading || !newName.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
              >
                {loading ? '保存中...' : '保存预设'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
