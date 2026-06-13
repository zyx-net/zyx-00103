import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-400', icon: FileText, bg: 'bg-gray-500/10' },
  pending_editor: { label: '待编辑复核', color: 'text-blue-400', icon: Clock, bg: 'bg-blue-500/10' },
  pending_legal: { label: '待法务确认', color: 'text-purple-400', icon: Clock, bg: 'bg-purple-500/10' },
  pending_publish: { label: '待发布', color: 'text-orange-400', icon: TrendingUp, bg: 'bg-orange-500/10' },
  published: { label: '已发布', color: 'text-green-400', icon: CheckCircle, bg: 'bg-green-500/10' },
  rejected: { label: '已退回', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10' },
};

const typeLabels: Record<string, string> = {
  factual_error: '事实错误',
  title_error: '标题错误',
  source_correction: '来源更正',
  content_addition: '内容补充',
  other: '其他',
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const { corrections, manuscripts, fetchCorrections, fetchManuscripts } = useDataStore();

  useEffect(() => {
    fetchCorrections();
    fetchManuscripts();
  }, []);

  const stats = useMemo(() => {
    const pending = corrections.filter(
      (c) => c.status === 'pending_editor' || c.status === 'pending_legal' || c.status === 'pending_publish'
    ).length;
    const published = corrections.filter((c) => c.status === 'published').length;
    const rejected = corrections.filter((c) => c.status === 'rejected').length;
    return { total: corrections.length, pending, published, rejected };
  }, [corrections]);

  const myCorrections = useMemo(() => {
    if (!user) return [];
    return corrections.filter((c) => c.creatorId === user.id).slice(0, 5);
  }, [corrections, user]);

  const needActionCorrections = useMemo(() => {
    if (!user) return [];
    let filtered = corrections;
    if (user.role === 'editor') {
      filtered = corrections.filter((c) => c.status === 'pending_editor');
    } else if (user.role === 'legal') {
      filtered = corrections.filter((c) => c.status === 'pending_legal');
    } else if (user.role === 'admin') {
      filtered = corrections.filter((c) => c.status === 'pending_publish');
    }
    return filtered.slice(0, 5);
  }, [corrections, user]);

  const roleNames: Record<string, string> = {
    journalist: '记者',
    editor: '编辑',
    legal: '法务',
    admin: '管理员',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">欢迎回来，{user?.displayName}</h1>
          <p className="text-gray-400 mt-1">
            您当前的角色是 <span className="text-orange-400">{roleNames[user?.role || '']}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">更正单总数</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileText className="text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">待处理</p>
              <p className="text-3xl font-bold mt-1 text-orange-400">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="text-orange-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">已发布</p>
              <p className="text-3xl font-bold mt-1 text-green-400">{stats.published}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">已退回</p>
              <p className="text-3xl font-bold mt-1 text-red-400">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="text-red-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user?.role === 'journalist' && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">我的更正单</h2>
              <Link
                to="/corrections"
                className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            {myCorrections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>暂无更正单</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myCorrections.map((correction) => {
                  const config = statusConfig[correction.status];
                  const Icon = config.icon;
                  return (
                    <Link
                      key={correction.id}
                      to={`/corrections/${correction.id}`}
                      className="block p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{correction.manuscriptTitle}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {typeLabels[correction.type]} · {correction.creatorName}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {['editor', 'legal', 'admin'].includes(user?.role || '') && needActionCorrections.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">待处理事项</h2>
              <Link
                to="/corrections"
                className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {needActionCorrections.map((correction) => {
                const config = statusConfig[correction.status];
                return (
                  <Link
                    key={correction.id}
                    to={`/corrections/${correction.id}`}
                    className="block p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors border-l-2 border-orange-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{correction.manuscriptTitle}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {typeLabels[correction.type]} · {correction.creatorName}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">最近稿件</h2>
            <Link
              to="/manuscripts"
              className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          {manuscripts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto mb-2" size={32} />
              <p>暂无稿件</p>
            </div>
          ) : (
            <div className="space-y-3">
              {manuscripts.slice(0, 5).map((manuscript) => (
                <Link
                  key={manuscript.id}
                  to={`/manuscripts/${manuscript.id}`}
                  className="block p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{manuscript.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {manuscript.authorName} ·{' '}
                        {manuscript.publishedAt
                          ? new Date(manuscript.publishedAt).toLocaleDateString('zh-CN')
                          : '草稿'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        manuscript.status === 'published'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {manuscript.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
