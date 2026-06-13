import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api, Correction, HistoryRecord } from '../../services/api';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  FileText,
  User,
  Shield,
  Scale,
  Settings,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string; description: string }> = {
  draft: { label: '草稿', color: 'text-gray-400', bg: 'bg-gray-500/10', description: '更正单尚未提交' },
  pending_editor: { label: '待编辑复核', color: 'text-blue-400', bg: 'bg-blue-500/10', description: '等待值班编辑复核' },
  pending_legal: { label: '待法务确认', color: 'text-purple-400', bg: 'bg-purple-500/10', description: '等待法务人员确认' },
  pending_publish: { label: '待发布', color: 'text-orange-400', bg: 'bg-orange-500/10', description: '等待管理员发布' },
  published: { label: '已发布', color: 'text-green-400', bg: 'bg-green-500/10', description: '更正已正式发布' },
  rejected: { label: '已退回', color: 'text-red-400', bg: 'bg-red-500/10', description: '更正单被退回修改' },
};

const typeLabels: Record<string, string> = {
  factual_error: '事实错误',
  title_error: '标题错误',
  source_correction: '来源更正',
  content_addition: '内容补充',
  other: '其他',
};

const actionLabels: Record<string, string> = {
  create: '创建更正单',
  submit: '提交',
  review_pass: '编辑复核通过',
  review_reject: '编辑退回',
  legal_confirm: '法务确认通过',
  legal_reject: '法务退回',
  publish: '发布',
  revoke: '撤销',
};

const roleIcons: Record<string, any> = {
  journalist: User,
  editor: Shield,
  legal: Scale,
  admin: Settings,
};

export default function CorrectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [showActionModal, setShowActionModal] = useState<'submit' | 'review' | 'legal' | 'publish' | 'revoke' | null>(null);
  const [actionType, setActionType] = useState<'pass' | 'reject' | 'confirm' | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const response = await api.corrections.get(id);
    if (response.success && response.data) {
      setCorrection(response.data as Correction);
      setHistory((response.data as Correction).history || []);
    } else {
      setError(response.error?.message || '获取更正单失败');
    }
    setLoading(false);
  };

  const handleAction = async () => {
    if (!correction || !showActionModal || !id) return;
    setActionLoading(true);
    setError(null);

    let success = false;
    switch (showActionModal) {
      case 'submit': {
        const r1 = await api.corrections.submit(id, comment);
        success = r1.success;
        break;
      }
      case 'review': {
        if (!actionType || (actionType !== 'pass' && actionType !== 'reject')) return;
        const r2 = await api.corrections.review(id, actionType, comment);
        success = r2.success;
        break;
      }
      case 'legal': {
        if (!actionType || (actionType !== 'confirm' && actionType !== 'reject')) return;
        const r3 = await api.corrections.legal(id, actionType, comment);
        success = r3.success;
        break;
      }
      case 'publish': {
        const r4 = await api.corrections.publish(id, comment);
        success = r4.success;
        break;
      }
      case 'revoke': {
        const r5 = await api.corrections.revoke(id, comment);
        success = r5.success;
        break;
      }
    }

    if (success) {
      await loadData();
      setShowActionModal(null);
      setComment('');
      setActionType(null);
    } else {
      setError('操作失败');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!correction) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">更正单不存在</p>
        <Link to="/corrections" className="text-orange-400 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  const config = statusConfig[correction.status];
  const canEdit = user?.role === 'journalist' && correction.creatorId === user.id && 
                  (correction.status === 'draft' || correction.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/corrections')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">更正单详情</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">{correction.manuscriptTitle}</h2>
                <p className="text-gray-400 mt-1">
                  更正类型：{typeLabels[correction.type]}
                  {correction.hasSourceDispute && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-sm">
                      来源争议
                    </span>
                  )}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>

            <p className={`text-sm ${config.color}`}>{config.description}</p>

            <div className="mt-6 pt-6 border-t border-gray-800 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400">证据说明</label>
                <p className="mt-1 text-gray-200">{correction.evidence || '未填写'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">截止时间</label>
                  <p className="mt-1 text-gray-200">{correction.deadline || '未设置'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">影响范围</label>
                  <p className="mt-1 text-gray-200">{correction.impactScope || '未填写'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <label className="text-sm font-medium text-gray-400">操作说明</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                placeholder="请输入操作说明（退回时必填）"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canEdit && (
                <>
                  <button
                    onClick={() => { setShowActionModal('submit'); setActionType(null); }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <Send size={18} />
                    提交更正单
                  </button>
                  <Link
                    to={`/corrections/${id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <FileText size={18} />
                    编辑更正单
                  </Link>
                </>
              )}

              {user?.role === 'editor' && correction.status === 'pending_editor' && (
                <>
                  <button
                    onClick={() => { setShowActionModal('review'); setActionType('pass'); }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <CheckCircle size={18} />
                    复核通过
                  </button>
                  <button
                    onClick={() => { setShowActionModal('review'); setActionType('reject'); }}
                    disabled={actionLoading || !comment.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <XCircle size={18} />
                    退回修改
                  </button>
                </>
              )}

              {user?.role === 'legal' && correction.status === 'pending_legal' && (
                <>
                  <button
                    onClick={() => { setShowActionModal('legal'); setActionType('confirm'); }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <CheckCircle size={18} />
                    确认通过
                  </button>
                  <button
                    onClick={() => { setShowActionModal('legal'); setActionType('reject'); }}
                    disabled={actionLoading || !comment.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <XCircle size={18} />
                    退回修改
                  </button>
                </>
              )}

              {user?.role === 'admin' && correction.status === 'pending_publish' && (
                <>
                  <button
                    onClick={() => { setShowActionModal('publish'); setActionType(null); }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <CheckCircle size={18} />
                    发布更正
                  </button>
                  <button
                    onClick={() => { setShowActionModal('legal'); setActionType('reject'); }}
                    disabled={actionLoading || !comment.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    <XCircle size={18} />
                    退回修改
                  </button>
                </>
              )}

              {user?.role === 'admin' && correction.status === 'published' && (
                <button
                  onClick={() => { setShowActionModal('revoke'); setActionType(null); }}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  <AlertTriangle size={18} />
                  撤销发布
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">操作历史</h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无操作记录</p>
            ) : (
              <div className="space-y-4">
                {history.map((record, index) => {
                  const Icon = roleIcons[record.operatorRole] || User;
                  return (
                    <div key={record.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                          <Icon size={18} className="text-gray-400" />
                        </div>
                        {index < history.length - 1 && (
                          <div className="w-px h-full min-h-[40px] bg-gray-800 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{record.operatorName}</span>
                          <span className="text-gray-500 text-sm">
                            {actionLabels[record.action] || record.action}
                          </span>
                        </div>
                        {record.comment && (
                          <p className="text-gray-400 text-sm mt-1">{record.comment}</p>
                        )}
                        <p className="text-gray-600 text-xs mt-1">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">基本信息</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">创建人</label>
                <p className="mt-1">{correction.creatorName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">创建时间</label>
                <p className="mt-1">{new Date(correction.createdAt).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">更新时间</label>
                <p className="mt-1">{new Date(correction.updatedAt).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">审批流程</h3>
            <div className="space-y-3">
              {[
                { status: 'pending_editor', label: '编辑复核', roles: ['editor'] },
                { status: 'pending_legal', label: '法务确认', roles: ['legal'] },
                { status: 'pending_publish', label: '发布', roles: ['admin'] },
              ].map((step, index) => {
                const stepStatus = correction.status;
                const isActive = step.status === stepStatus;
                const isPast = ['draft', 'rejected'].includes(stepStatus) ? false :
                  (['pending_editor', 'pending_legal', 'pending_publish', 'published'].indexOf(stepStatus) > index);
                return (
                  <div
                    key={step.status}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isActive ? 'bg-orange-500/10 border border-orange-500/30' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isPast ? 'bg-green-500/20 text-green-400' :
                      isActive ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      {isPast ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <p className={`font-medium ${isActive ? 'text-orange-400' : ''}`}>{step.label}</p>
                      <p className="text-xs text-gray-500">
                        {step.roles.includes('editor') && '值班编辑'}
                        {step.roles.includes('legal') && '法务人员'}
                        {step.roles.includes('admin') && '管理员'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">
                {showActionModal === 'submit' && '确认提交'}
                {showActionModal === 'review' && actionType === 'pass' && '确认复核通过'}
                {showActionModal === 'review' && actionType === 'reject' && '确认退回'}
                {showActionModal === 'legal' && actionType === 'confirm' && '确认法务通过'}
                {showActionModal === 'legal' && actionType === 'reject' && '确认法务退回'}
                {showActionModal === 'publish' && '确认发布'}
                {showActionModal === 'revoke' && '确认撤销'}
              </h3>
              <p className="text-gray-400">
                {showActionModal === 'submit' && '提交后更正单将进入编辑复核流程'}
                {showActionModal === 'review' && actionType === 'pass' && '复核通过后更正单将进入法务确认流程'}
                {showActionModal === 'review' && actionType === 'reject' && '退回后更正单将返回给记者修改'}
                {showActionModal === 'legal' && actionType === 'confirm' && '确认后更正单将进入待发布状态'}
                {showActionModal === 'legal' && actionType === 'reject' && '退回后更正单将返回给记者修改'}
                {showActionModal === 'publish' && '发布后更正将正式对外公示'}
                {showActionModal === 'revoke' && '撤销后更正单将返回待发布状态'}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => { setShowActionModal(null); setComment(''); setActionType(null); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || (actionType === 'reject' && !comment.trim())}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  (actionType === 'reject' || showActionModal === 'revoke')
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                } disabled:bg-gray-700 disabled:text-gray-500`}
              >
                {actionLoading ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
