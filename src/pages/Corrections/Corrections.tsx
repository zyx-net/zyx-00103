import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Plus, Search, AlertCircle, Eye, Edit } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  pending_editor: { label: '待编辑复核', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  pending_legal: { label: '待法务确认', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  pending_publish: { label: '待发布', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  published: { label: '已发布', color: 'text-green-400', bg: 'bg-green-500/10' },
  rejected: { label: '已退回', color: 'text-red-400', bg: 'bg-red-500/10' },
};

const typeLabels: Record<string, string> = {
  factual_error: '事实错误',
  title_error: '标题错误',
  source_correction: '来源更正',
  content_addition: '内容补充',
  other: '其他',
};

const statusFilters = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_editor,pending_legal,pending_publish', label: '待处理' },
  { value: 'published', label: '已发布' },
  { value: 'rejected', label: '已退回' },
];

export default function Corrections() {
  const { user } = useAuthStore();
  const { corrections, fetchCorrections, manuscripts, fetchManuscripts, error } = useDataStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCorrections();
    fetchManuscripts();
  }, []);

  const filteredCorrections = useMemo(() => {
    let filtered = corrections;
    
    if (user?.role === 'journalist') {
      filtered = filtered.filter((c) => c.creatorId === user.id);
    }
    
    if (statusFilter) {
      const statuses = statusFilter.split(',');
      filtered = filtered.filter((c) => statuses.includes(c.status));
    }
    
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.manuscriptTitle.toLowerCase().includes(search.toLowerCase()) ||
          c.creatorName.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return filtered;
  }, [corrections, user, statusFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">更正单管理</h1>
        {user?.role === 'journalist' && (
          <Link
            to="/corrections/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            创建更正单
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            placeholder="搜索更正单..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">稿件标题</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">类型</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">创建人</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">状态</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">截止时间</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCorrections.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <AlertCircle className="mx-auto mb-2" size={32} />
                  <p>暂无更正单</p>
                </td>
              </tr>
            ) : (
              filteredCorrections.map((correction) => {
                const config = statusConfig[correction.status];
                return (
                  <tr
                    key={correction.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium">{correction.manuscriptTitle}</p>
                      {correction.hasSourceDispute && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">
                          来源争议
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {typeLabels[correction.type]}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{correction.creatorName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {correction.deadline || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/corrections/${correction.id}`}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye size={18} className="text-gray-400" />
                        </Link>
                        {user?.role === 'journalist' && correction.creatorId === user.id && 
                         (correction.status === 'draft' || correction.status === 'rejected') && (
                          <Link
                            to={`/corrections/${correction.id}/edit`}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit size={18} className="text-orange-400" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
