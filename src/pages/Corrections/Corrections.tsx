import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Plus, Search, AlertCircle, Eye, Edit, CheckSquare, Square, X, Check, AlertTriangle, Loader2, Download } from 'lucide-react';
import { BatchResultItem } from '../../services/api';

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

type BatchOperationType = 'review_pass' | 'review_reject' | 'legal_confirm' | 'legal_reject' | 'publish' | 'revoke';

interface BatchResult {
  items: BatchResultItem[];
  total: number;
  success: number;
  skipped: number;
  failed: number;
}

export default function Corrections() {
  const { user } = useAuthStore();
  const { corrections, fetchCorrections, fetchManuscripts, error } = useDataStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<BatchOperationType | null>(null);
  const [operationComment, setOperationComment] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [executing, setExecuting] = useState(false);

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

  const selectedCorrections = useMemo(() => {
    return corrections.filter(c => selectedIds.has(c.id));
  }, [corrections, selectedIds]);

  const selectableCorrections = useMemo(() => {
    if (!user) return [];
    
    if (user.role === 'editor') {
      return filteredCorrections.filter(c => c.status === 'pending_editor');
    }
    
    if (user.role === 'legal') {
      return filteredCorrections.filter(c => c.status === 'pending_legal');
    }
    
    if (user.role === 'admin') {
      const canPublish = selectedIds.size > 0 && corrections.some(c => selectedIds.has(c.id) && c.status === 'pending_publish');
      const canRevoke = selectedIds.size > 0 && corrections.some(c => selectedIds.has(c.id) && c.status === 'published');
      if (canPublish) {
        return filteredCorrections.filter(c => c.status === 'pending_publish');
      }
      if (canRevoke) {
        return filteredCorrections.filter(c => c.status === 'published');
      }
      return filteredCorrections.filter(c => c.status === 'pending_publish' || c.status === 'published');
    }
    
    return [];
  }, [filteredCorrections, user, selectedIds, corrections]);

  const hasInvalidSelection = useMemo(() => {
    if (!user) return false;
    
    if (user.role === 'editor') {
      return selectedCorrections.some(c => c.status !== 'pending_editor');
    }
    
    if (user.role === 'legal') {
      return selectedCorrections.some(c => c.status !== 'pending_legal');
    }
    
    if (user.role === 'admin') {
      const canPublish = selectedCorrections.some(c => c.status === 'pending_publish');
      const canRevoke = selectedCorrections.some(c => c.status === 'published');
      if (canPublish) {
        return selectedCorrections.some(c => c.status !== 'pending_publish');
      }
      if (canRevoke) {
        return selectedCorrections.some(c => c.status !== 'published');
      }
      return false;
    }
    
    return false;
  }, [selectedCorrections, user]);

  const getAvailableOperations = () => {
    if (!user) return [];

    const ops: { type: BatchOperationType; label: string; action: string; commentRequired: boolean }[] = [];

    if (user.role === 'editor') {
      const canReview = selectedCorrections.some(c => c.status === 'pending_editor');
      if (canReview) {
        ops.push({ type: 'review_pass', label: '批量复核通过', action: 'pass', commentRequired: false });
        ops.push({ type: 'review_reject', label: '批量退回', action: 'reject', commentRequired: true });
      }
    }

    if (user.role === 'legal') {
      const canConfirm = selectedCorrections.some(c => c.status === 'pending_legal');
      if (canConfirm) {
        ops.push({ type: 'legal_confirm', label: '批量确认通过', action: 'confirm', commentRequired: false });
        ops.push({ type: 'legal_reject', label: '批量退回', action: 'reject', commentRequired: true });
      }
    }

    if (user.role === 'admin') {
      const canPublish = selectedCorrections.some(c => c.status === 'pending_publish');
      const canRevoke = selectedCorrections.some(c => c.status === 'published');
      if (canPublish) {
        ops.push({ type: 'publish', label: '批量发布', action: 'publish', commentRequired: false });
      }
      if (canRevoke) {
        ops.push({ type: 'revoke', label: '批量撤销', action: 'revoke', commentRequired: false });
      }
    }

    return ops;
  };

  const handleSelectAll = () => {
    if (selectedIds.size === selectableCorrections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableCorrections.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleOpenConfirm = (operation: BatchOperationType) => {
    if (hasInvalidSelection) {
      return;
    }
    setPendingOperation(operation);
    setOperationComment('');
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingOperation || executing) return;

    setExecuting(true);
    setShowConfirmModal(false);

    try {
      let result: BatchResult | null = null;

      switch (pendingOperation) {
        case 'review_pass':
          result = await batchReview('pass', operationComment);
          break;
        case 'review_reject':
          result = await batchReview('reject', operationComment);
          break;
        case 'legal_confirm':
          result = await batchLegal('confirm', operationComment);
          break;
        case 'legal_reject':
          result = await batchLegal('reject', operationComment);
          break;
        case 'publish':
          result = await batchPublish(operationComment);
          break;
        case 'revoke':
          result = await batchRevoke(operationComment);
          break;
      }

      if (result) {
        setBatchResult(result);
        setShowResultModal(true);
        setSelectedIds(new Set());
      }
    } finally {
      setExecuting(false);
    }
  };

  const batchReview = async (action: 'pass' | 'reject', comment: string) => {
    const ids = Array.from(selectedIds);
    const response = await useDataStore.getState().batchReviewCorrections(ids, action, comment);
    if (response) {
      return {
        items: response.data,
        total: response.summary.total,
        success: response.summary.success,
        skipped: response.summary.skipped,
        failed: response.summary.failed,
      };
    }
    return null;
  };

  const batchLegal = async (action: 'confirm' | 'reject', comment: string) => {
    const ids = Array.from(selectedIds);
    const response = await useDataStore.getState().batchLegalCorrections(ids, action, comment);
    if (response) {
      return {
        items: response.data,
        total: response.summary.total,
        success: response.summary.success,
        skipped: response.summary.skipped,
        failed: response.summary.failed,
      };
    }
    return null;
  };

  const batchPublish = async (comment: string) => {
    const ids = Array.from(selectedIds);
    const response = await useDataStore.getState().batchPublishCorrections(ids, comment);
    if (response) {
      return {
        items: response.data,
        total: response.summary.total,
        success: response.summary.success,
        skipped: response.summary.skipped,
        failed: response.summary.failed,
      };
    }
    return null;
  };

  const batchRevoke = async (comment: string) => {
    const ids = Array.from(selectedIds);
    const response = await useDataStore.getState().batchRevokeCorrections(ids, comment);
    if (response) {
      return {
        items: response.data,
        total: response.summary.total,
        success: response.summary.success,
        skipped: response.summary.skipped,
        failed: response.summary.failed,
      };
    }
    return null;
  };

  const exportBatchResultToCSV = (result: BatchResult) => {
    const headers = ['ID', '标题', '结果', '原因', '时间'];
    const rows = result.items.map(item => {
      const correction = corrections.find(c => c.id === item.id);
      return [
        item.id,
        correction?.manuscriptTitle || '',
        item.message,
        item.reason || '',
        new Date().toLocaleString('zh-CN'),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_result_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const availableOperations = getAvailableOperations();
  const canSelect = user?.role === 'editor' || user?.role === 'legal' || user?.role === 'admin';

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

      {canSelect && selectableCorrections.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === selectableCorrections.length && selectableCorrections.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
                />
                <span className="text-gray-300">
                  全选当前页可选更正单 ({selectedIds.size}/{selectableCorrections.length})
                </span>
              </label>
              {hasInvalidSelection && (
                <span className="flex items-center gap-1 text-yellow-400 text-sm">
                  <AlertTriangle size={16} />
                  已选中的更正单包含已发布/已退回项
                </span>
              )}
            </div>

            {selectedIds.size > 0 && availableOperations.length > 0 && (
              <div className="flex items-center gap-2">
                {availableOperations.map((op) => (
                  <button
                    key={op.type}
                    onClick={() => handleOpenConfirm(op.type)}
                    disabled={executing || hasInvalidSelection}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      hasInvalidSelection
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : op.type.includes('reject') || op.type === 'revoke'
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {canSelect && (
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400 w-12"></th>
              )}
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
                <td colSpan={canSelect ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                  <AlertCircle className="mx-auto mb-2" size={32} />
                  <p>暂无更正单</p>
                </td>
              </tr>
            ) : (
              filteredCorrections.map((correction) => {
                const config = statusConfig[correction.status];
                const isSelectable = selectableCorrections.some(c => c.id === correction.id);
                const isSelected = selectedIds.has(correction.id);

                return (
                  <tr
                    key={correction.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                      isSelected && !isSelectable ? 'bg-red-500/5' : ''
                    }`}
                  >
                    {canSelect && (
                      <td className="px-6 py-4">
                        {isSelectable ? (
                          <button
                            onClick={() => handleSelectOne(correction.id)}
                            className="text-gray-400 hover:text-orange-400 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare size={20} className="text-orange-400" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block w-5 h-5">
                            {isSelected && <X size={20} className="text-red-400" />}
                          </span>
                        )}
                      </td>
                    )}
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

      {showConfirmModal && pendingOperation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              确认{availableOperations.find(o => o.type === pendingOperation)?.label}
            </h3>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">即将操作的更正单：</p>
              <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                {selectedCorrections.map((c) => {
                  const isInvalid = c.status === 'published' || c.status === 'rejected';
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-2 py-1 ${
                        isInvalid ? 'text-red-400' : 'text-gray-300'
                      }`}
                    >
                      {isInvalid ? <X size={16} /> : <Check size={16} />}
                      <span className="truncate">{c.manuscriptTitle}</span>
                      <span className="text-xs text-gray-500">
                        ({statusConfig[c.status]?.label})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {availableOperations.find(o => o.type === pendingOperation)?.commentRequired && (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">备注（必填）：</label>
                <textarea
                  value={operationComment}
                  onChange={(e) => setOperationComment(e.target.value)}
                  placeholder="请输入操作原因..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 resize-none"
                  rows={3}
                />
              </div>
            )}

            {!availableOperations.find(o => o.type === pendingOperation)?.commentRequired && (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">备注（可选）：</label>
                <textarea
                  value={operationComment}
                  onChange={(e) => setOperationComment(e.target.value)}
                  placeholder="请输入操作备注..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={executing}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  executing ||
                  (availableOperations.find(o => o.type === pendingOperation)?.commentRequired && !operationComment.trim())
                }
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  pendingOperation.includes('reject') || pendingOperation === 'revoke'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {executing && <Loader2 size={16} className="animate-spin" />}
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}

      {showResultModal && batchResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">批量操作结果</h3>

            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check size={18} />
                <span>成功: {batchResult.success}</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle size={18} />
                <span>跳过: {batchResult.skipped}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <X size={18} />
                <span>失败: {batchResult.failed}</span>
              </div>
            </div>

            <div className="flex-1 bg-gray-800 rounded-lg p-3 overflow-y-auto">
              {batchResult.items.map((item) => {
                const correction = corrections.find(c => c.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 py-2 border-b border-gray-700 last:border-0 ${
                      item.success
                        ? 'text-green-400'
                        : item.message === '跳过'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    <span className="mt-0.5">
                      {item.success ? (
                        <Check size={16} />
                      ) : item.message === '跳过' ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <X size={16} />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {correction?.manuscriptTitle || item.id}
                      </p>
                      <p className="text-sm opacity-75">
                        {item.message}
                        {item.reason && `: ${item.reason}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => exportBatchResultToCSV(batchResult)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                导出 CSV
              </button>
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setBatchResult(null);
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
