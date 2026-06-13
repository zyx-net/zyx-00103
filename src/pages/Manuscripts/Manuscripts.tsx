import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Plus, Search, FileText, Trash2, Eye, Edit } from 'lucide-react';
import { api } from '../../services/api';

export default function Manuscripts() {
  const { user } = useAuthStore();
  const { manuscripts, fetchManuscripts, createManuscript, deleteManuscript, error } = useDataStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchManuscripts();
  }, []);

  const filteredManuscripts = manuscripts.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.authorName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const success = await createManuscript({
      title: newTitle.trim(),
      content: newContent.trim(),
    });
    if (success) {
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteManuscript(id);
    if (success) {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">稿件管理</h1>
        {user?.role === 'journalist' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            创建稿件
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          placeholder="搜索稿件..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl focus:outline-none focus:border-orange-500/50 transition-colors"
        />
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
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">标题</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">作者</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">状态</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">发布时间</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredManuscripts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <FileText className="mx-auto mb-2" size={32} />
                  <p>暂无稿件</p>
                </td>
              </tr>
            ) : (
              filteredManuscripts.map((manuscript) => (
                <tr key={manuscript.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <p className="font-medium">{manuscript.title}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{manuscript.content}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{manuscript.authorName}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        manuscript.status === 'published'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {manuscript.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {manuscript.publishedAt
                      ? new Date(manuscript.publishedAt).toLocaleDateString('zh-CN')
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/manuscripts/${manuscript.id}`}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="查看"
                      >
                        <Eye size={18} className="text-gray-400" />
                      </Link>
                      {user?.role === 'journalist' && manuscript.authorId === user.id && manuscript.status !== 'published' && (
                        <>
                          <Link
                            to={`/corrections/new?manuscriptId=${manuscript.id}`}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="创建更正"
                          >
                            <Edit size={18} className="text-orange-400" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(manuscript.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 size={18} className="text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">创建稿件</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">标题</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="请输入标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">内容</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="请输入内容"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">确认删除</h3>
              <p className="text-gray-400">确定要删除这篇稿件吗？此操作无法撤销。</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
