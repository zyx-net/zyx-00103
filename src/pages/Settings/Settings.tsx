import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { api, FilterConfig, Manuscript } from '../../services/api';
import { Download, FileJson, FileSpreadsheet, Plus, Trash2, AlertCircle, Filter } from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const { manuscripts, fetchManuscripts } = useDataStore();
  const [configs, setConfigs] = useState<FilterConfig[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [filterManuscriptId, setFilterManuscriptId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

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

  const handleCreateConfig = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const response = await api.configs.create({ name: newName.trim() });
    if (response.success) {
      await fetchConfigs();
      setShowCreateModal(false);
      setNewName('');
    } else {
      setError(response.error?.message || '创建配置失败');
    }
    setLoading(false);
  };

  const handleDeleteConfig = async (id: string) => {
    const response = await api.configs.delete(id);
    if (response.success) {
      await fetchConfigs();
    } else {
      setError(response.error?.message || '删除配置失败');
    }
  };

  const handleExport = async (type: 'json' | 'csv') => {
    setExportLoading(true);
    setError(null);

    const params: { manuscriptId?: string; dateFrom?: string; dateTo?: string } = {};
    if (filterManuscriptId) params.manuscriptId = filterManuscriptId;
    if (filterDateFrom) params.dateFrom = filterDateFrom;
    if (filterDateTo) params.dateTo = filterDateTo;

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
    } catch (err) {
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
  };

  const hasFilters = filterManuscriptId || filterDateFrom || filterDateTo;

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
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">数据导出</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          可按稿件或日期范围筛选导出数据，不设置筛选条件则导出全部数据
        </p>

        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Filter size={16} />
            <span>筛选条件</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-orange-400 hover:text-orange-300 text-xs"
              >
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
          <h2 className="text-lg font-semibold">筛选配置</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            新建配置
          </button>
        </div>

        {configs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无筛选配置</p>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{config.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    创建于 {new Date(config.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteConfig(config.id)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Trash2 size={18} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">新建筛选配置</h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="请输入配置名称"
                autoFocus
              />
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
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
