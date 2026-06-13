import { useEffect, useState, useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { History as HistoryIcon, User, Shield, Scale, Settings, ChevronDown } from 'lucide-react';

const actionLabels: Record<string, string> = {
  create: '创建更正单',
  submit: '提交更正单',
  review_pass: '编辑复核通过',
  review_reject: '编辑退回',
  legal_confirm: '法务确认通过',
  legal_reject: '法务退回',
  publish: '发布更正',
  revoke: '撤销发布',
};

const actionColors: Record<string, string> = {
  create: 'text-blue-400 bg-blue-500/10',
  submit: 'text-blue-400 bg-blue-500/10',
  review_pass: 'text-green-400 bg-green-500/10',
  review_reject: 'text-red-400 bg-red-500/10',
  legal_confirm: 'text-purple-400 bg-purple-500/10',
  legal_reject: 'text-red-400 bg-red-500/10',
  publish: 'text-green-400 bg-green-500/10',
  revoke: 'text-orange-400 bg-orange-500/10',
};

const roleIcons: Record<string, any> = {
  journalist: User,
  editor: Shield,
  legal: Scale,
  admin: Settings,
};

export default function History() {
  const { history, corrections, fetchHistory, fetchCorrections } = useDataStore();
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHistory();
    fetchCorrections();
  }, []);

  const toggleRecord = (id: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecords(newExpanded);
  };

  const groupedHistory = useMemo(() => {
    const groups: Record<string, typeof history> = {};
    history.forEach((record) => {
      const date = new Date(record.createdAt).toLocaleDateString('zh-CN');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
    });
    return groups;
  }, [history]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">操作历史</h1>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        {history.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <HistoryIcon className="mx-auto mb-2" size={32} />
            <p>暂无操作记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {Object.entries(groupedHistory).map(([date, records]) => (
              <div key={date}>
                <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-800">
                  <span className="text-sm font-medium text-gray-400">{date}</span>
                  <span className="ml-2 text-xs text-gray-600">{records.length} 条记录</span>
                </div>
                {records.map((record) => {
                  const Icon = roleIcons[record.operatorRole] || User;
                  const correction = corrections.find((c) => c.id === record.correctionId);
                  const isExpanded = expandedRecords.has(record.id);

                  return (
                    <div
                      key={record.id}
                      className="px-6 py-4 hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => toggleRecord(record.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Icon size={18} className="text-gray-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{record.operatorName}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  actionColors[record.action]
                                }`}
                              >
                                {actionLabels[record.action] || record.action}
                              </span>
                            </div>
                            {correction && (
                              <p className="text-sm text-gray-400 mt-1">
                                稿件：{correction.manuscriptTitle}
                              </p>
                            )}
                            {record.comment && (
                              <p className="text-sm text-gray-500 mt-1">{record.comment}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            {new Date(record.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <ChevronDown
                            size={18}
                            className={`text-gray-500 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 ml-14 p-4 bg-gray-800/50 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">操作人角色：</span>
                              <span className="ml-2">
                                {record.operatorRole === 'journalist' && '记者'}
                                {record.operatorRole === 'editor' && '编辑'}
                                {record.operatorRole === 'legal' && '法务'}
                                {record.operatorRole === 'admin' && '管理员'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">操作时间：</span>
                              <span className="ml-2">
                                {new Date(record.createdAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            {record.previousStatus && (
                              <div>
                                <span className="text-gray-500">原状态：</span>
                                <span className="ml-2">{record.previousStatus}</span>
                              </div>
                            )}
                            {record.newStatus && (
                              <div>
                                <span className="text-gray-500">新状态：</span>
                                <span className="ml-2">{record.newStatus}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
