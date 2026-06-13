import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { User, Shield, Scale, Settings } from 'lucide-react';

const users = [
  { username: 'journalist', password: 'journalist123', role: 'journalist', label: '记者', icon: User },
  { username: 'editor', password: 'editor123', role: 'editor', label: '编辑', icon: Shield },
  { username: 'legal', password: 'legal123', role: 'legal', label: '法务', icon: Scale },
  { username: 'admin', password: 'admin123', role: 'admin', label: '管理员', icon: Settings },
];

const roleDescriptions: Record<string, string> = {
  journalist: '提交更正单、查看我的稿件、追踪更正进度',
  editor: '复核更正单、退回修改、查看所有稿件',
  legal: '确认来源争议、审核合规性、查看所有稿件',
  admin: '发布更正、撤销发布、导出数据、管理配置',
};

export default function Login() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!selectedUser) return;
    const user = users.find((u) => u.username === selectedUser);
    if (!user) return;

    const success = await login(user.username, user.password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-orange-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-6 shadow-lg shadow-orange-500/20">
            <span className="text-2xl font-bold">更</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">稿件更正与发布审批工作台</h1>
          <p className="text-gray-400">请选择您的角色登录</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          {users.map((user) => {
            const Icon = user.icon;
            const isSelected = selectedUser === user.username;
            return (
              <button
                key={user.username}
                onClick={() => setSelectedUser(user.username)}
                className={`relative p-6 rounded-xl border transition-all duration-300 text-left ${
                  isSelected
                    ? 'bg-orange-500/10 border-orange-500/50 shadow-lg shadow-orange-500/10'
                    : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    isSelected ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <Icon size={24} />
                </div>
                <h3 className={`font-semibold mb-1 ${isSelected ? 'text-orange-400' : ''}`}>
                  {user.label}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {roleDescriptions[user.role]}
                </p>
                <div
                  className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-gray-600'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleLogin}
          disabled={!selectedUser || isLoading}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
            selectedUser && !isLoading
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              登录中...
            </span>
          ) : (
            '登录'
          )}
        </button>

        <div className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
          <p className="text-sm text-gray-400 mb-2">测试账号说明：</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            {users.map((user) => (
              <div key={user.username} className="flex items-center gap-2">
                <span className="text-gray-600">|</span>
                <span>{user.label}:</span>
                <code className="text-gray-400">{user.username}</code>
                <span>/</span>
                <code className="text-gray-400">{user.password}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
