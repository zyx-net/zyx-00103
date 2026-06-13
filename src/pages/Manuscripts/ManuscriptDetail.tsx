import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, Manuscript } from '../../services/api';
import { ArrowLeft, Calendar, User, FileText, Edit } from 'lucide-react';

export default function ManuscriptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const response = await api.manuscripts.get(id);
    if (response.success && response.data) {
      setManuscript(response.data as Manuscript);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">稿件不存在</p>
        <Link to="/manuscripts" className="text-orange-400 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/manuscripts')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">稿件详情</h1>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold">{manuscript.title}</h2>
          <span
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              manuscript.status === 'published'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-gray-500/10 text-gray-400'
            }`}
          >
            {manuscript.status === 'published' ? '已发布' : '草稿'}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>{manuscript.authorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>创建于 {new Date(manuscript.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
          {manuscript.publishedAt && (
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>
                发布于 {new Date(manuscript.publishedAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-2">内容</h3>
          <div className="prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-gray-200 leading-relaxed">
              {manuscript.content || '暂无内容'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Link
          to={`/corrections/new?manuscriptId=${manuscript.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors"
        >
          <Edit size={18} />
          创建更正单
        </Link>
      </div>
    </div>
  );
}
