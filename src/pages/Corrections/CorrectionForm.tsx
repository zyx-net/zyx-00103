import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { api, Correction } from '../../services/api';
import { ArrowLeft, Save, Send } from 'lucide-react';

type CorrectionType = 'factual_error' | 'title_error' | 'source_correction' | 'content_addition' | 'other';

const typeOptions = [
  { value: 'factual_error', label: '事实错误' },
  { value: 'title_error', label: '标题错误' },
  { value: 'source_correction', label: '来源更正' },
  { value: 'content_addition', label: '内容补充' },
  { value: 'other', label: '其他' },
];

export default function CorrectionForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { manuscripts, fetchManuscripts, setError } = useDataStore();
  
  const [manuscriptId, setManuscriptId] = useState('');
  const [type, setType] = useState<CorrectionType | ''>('');
  const [evidence, setEvidence] = useState('');
  const [deadline, setDeadline] = useState('');
  const [impactScope, setImpactScope] = useState('');
  const [hasSourceDispute, setHasSourceDispute] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null);

  const isEditing = Boolean(id);

  useEffect(() => {
    fetchManuscripts();
  }, []);

  useEffect(() => {
    const loadCorrection = async () => {
      if (!id) {
        const preselectedId = searchParams.get('manuscriptId');
        if (preselectedId) {
          setManuscriptId(preselectedId);
        }
        setInitialLoading(false);
        return;
      }

      const response = await api.corrections.get(id);
      if (response.success && response.data) {
        const correction = response.data as Correction;
        setManuscriptId(correction.manuscriptId);
        setType(correction.type);
        setEvidence(correction.evidence);
        setDeadline(correction.deadline);
        setImpactScope(correction.impactScope);
        setHasSourceDispute(correction.hasSourceDispute);
      } else {
        setLocalError(response.error?.message || '获取更正单失败');
      }
      setInitialLoading(false);
    };

    loadCorrection();
  }, [id, searchParams]);

  const handleSubmit = async (submit: boolean) => {
    if (!manuscriptId) {
      setLocalError('请选择稿件');
      return;
    }
    if (!type) {
      setLocalError('请选择更正类型');
      return;
    }

    setLoading(true);
    setLocalError(null);

    const data = {
      manuscriptId,
      type: type as CorrectionType,
      evidence: evidence.trim(),
      deadline,
      impactScope: impactScope.trim(),
      hasSourceDispute,
    };

    let success = false;
    let correctionId = id;

    if (isEditing) {
      const response = await api.corrections.update(id!, data);
      success = response.success;
      if (!success) {
        setLocalError(response.error?.message || '更新更正单失败');
      }
    } else {
      const response = await api.corrections.create(data);
      if (response.success && response.data) {
        success = true;
        correctionId = (response.data as Correction).id;
      } else {
        setLocalError(response.error?.message || '创建更正单失败');
      }
    }

    if (success && submit && correctionId) {
      const submitResponse = await api.corrections.submit(correctionId);
      if (submitResponse.success) {
        navigate('/corrections');
      } else {
        setLocalError(submitResponse.error?.message || '提交失败');
      }
    } else if (success) {
      navigate('/corrections');
    }

    setLoading(false);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/corrections')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{isEditing ? '编辑更正单' : '创建更正单'}</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            关联稿件 <span className="text-red-400">*</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              value={manuscripts.find((m) => m.id === manuscriptId)?.title || ''}
              disabled
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-500"
            />
          ) : (
            <select
              value={manuscriptId}
              onChange={(e) => setManuscriptId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
            >
              <option value="">请选择稿件</option>
              {manuscripts
                .filter((m) => m.status === 'published')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            更正类型 <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value as CorrectionType)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  type === option.value
                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            证据说明 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
            placeholder="请详细描述更正的事实依据和证据"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              截止时间 <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            影响范围 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={impactScope}
            onChange={(e) => setImpactScope(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
            placeholder="例如：约5000名读者已阅读"
          />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSourceDispute}
              onChange={(e) => setHasSourceDispute(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
            />
            <div>
              <span className="font-medium">涉及来源争议</span>
              <p className="text-sm text-gray-500">如果更正涉及数据来源或引用争议，需要法务确认</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/corrections')}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
        >
          <Save size={18} />
          保存
        </button>
        {!isEditing && (
          <button
            onClick={() => handleSubmit(true)}
            disabled={loading || !manuscriptId || !type}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
          >
            <Send size={18} />
            保存并提交
          </button>
        )}
      </div>
    </div>
  );
}
