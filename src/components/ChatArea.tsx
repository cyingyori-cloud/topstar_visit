import { useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import { Bot, ChevronDown, Sparkles, X } from 'lucide-react';
import { normalizeCompanyNames } from '../utils/companyNames';
import { useState } from 'react';
import { testAgentConnection } from '../services/agent';

const suggestions = [
  '客户分层规则',
  '拜访频率检查',
  '行业案例匹配',
  '话术推荐',
];

const providerOptions = [
  { label: 'OpenAI / 兼容接口', value: 'OpenAI / 兼容接口' },
  { label: 'DashScope', value: 'DashScope' },
  { label: 'Anthropic (Claude)', value: 'Anthropic' },
  { label: '本地规则（备用）', value: '本地规则' },
];

const MODEL_CONFIG_STORAGE_KEY = 'topstar-visit-model-config-v1';

export default function ChatArea() {
  const {
    messages,
    isTyping,
    sendMessage,
    agentEnabled,
    lastAgentError,
    modelConfigOpen,
    setModelConfigOpen,
    modelProviderLabel,
    setModelProviderLabel,
    runtimeConfig,
    setRuntimeConfig,
    modelConnectionStatus,
    modelConnectionMessage,
    setModelConnectionStatus,
    setModelConnectionMessage,
  } = useAppStore();
  const [providerDraft, setProviderDraft] = useState(modelProviderLabel);
  const [baseUrlDraft, setBaseUrlDraft] = useState(runtimeConfig?.baseUrl || '');
  const [modelDraft, setModelDraft] = useState(runtimeConfig?.model || '');
  const [apiKeyDraft, setApiKeyDraft] = useState(runtimeConfig?.apiKey || '');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastAssistant = [...messages].reverse().find(msg => msg.role === 'assistant');
  const agentMeta = lastAssistant?.meta;
  const coachBadge = agentMeta?.coachMode ? `Coach · ${agentMeta.coachMode}` : null;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const raw = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved?.provider) setModelProviderLabel(saved.provider);
      if (saved?.runtimeConfig) setRuntimeConfig(saved.runtimeConfig);
    } catch {
      // ignore invalid local cache
    }
  }, [setModelProviderLabel, setRuntimeConfig]);

  const openModelConfig = () => {
    setProviderDraft(modelProviderLabel);
    setBaseUrlDraft(runtimeConfig?.baseUrl || '');
    setModelDraft(runtimeConfig?.model || '');
    setApiKeyDraft(runtimeConfig?.apiKey || '');
    setModelConfigOpen(true);
  };

  const buildRuntimeConfigDraft = () => providerDraft === '本地规则'
    ? null
    : {
        provider: providerDraft,
        baseUrl: baseUrlDraft.trim(),
        model: modelDraft.trim(),
        apiKey: apiKeyDraft.trim(),
        apiMode: providerDraft === 'Anthropic' ? 'messages' : 'chat_completions',
      };

  const handleSaveModelConfig = () => {
    const nextRuntimeConfig = buildRuntimeConfigDraft();
    setModelProviderLabel(providerDraft || '本地规则');
    setRuntimeConfig(nextRuntimeConfig);
    window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify({
      provider: providerDraft || '本地规则',
      runtimeConfig: nextRuntimeConfig,
    }));
    setModelConfigOpen(false);
  };

  const handleTestConnection = async () => {
    const config = buildRuntimeConfigDraft();
    if (!config) {
      setModelConnectionStatus('idle');
      setModelConnectionMessage('当前使用本地规则，无需外部模型连接。');
      return;
    }
    setModelConnectionStatus('testing');
    setModelConnectionMessage('正在测试连接...');
    const result = await testAgentConnection(config);
    if (result.ok) {
      setModelConnectionStatus('success');
      setModelConnectionMessage(`连接成功：${result.provider} / ${result.model}`);
    } else {
      setModelConnectionStatus('error');
      setModelConnectionMessage(result.error || '连接失败');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1B6EF3, #7C3AED)' }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-sm" style={{ color: '#1F2329' }}>智能拜访助手</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {/* 单一状态标签：只显示实际使用的模式 */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: agentMeta?.source === 'agent' ? 'rgba(82,196,26,0.12)' : 'rgba(245,166,35,0.12)',
              color: agentMeta?.source === 'agent' ? '#389E0D' : '#D48806',
            }}
          >
            {agentMeta?.source === 'agent'
              ? `AI · ${agentMeta.model || runtimeConfig?.model || 'OpenAI'}`
              : '本地规则'
            }
          </span>
          {coachBadge && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(27,110,243,0.10)',
                color: '#1B6EF3',
              }}
            >
              Coach · {coachBadge.split(' · ')[1]}
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: '#5A5A5A' }}
          >
            <Sparkles className="w-3 h-3" style={{ color: '#1B6EF3' }} />
            {agentMeta?.source === 'agent' ? '切换模型' : '启用 AI'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showModelMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                style={{ color: '#1F2329' }}
                onClick={() => {
                  setShowModelMenu(false);
                  openModelConfig();
                }}
              >
                模型配置
              </button>
            </div>
          )}
        </div>
      </div>

      {lastAgentError && (
        <div className="px-5 py-2 text-xs border-b border-gray-100" style={{ color: '#D48806', backgroundColor: '#FFFBE6' }}>
          AI 不可用，已自动切换到本地规则：{lastAgentError}
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1B6EF3, #7C3AED)' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#F5F7FA', borderTopLeftRadius: '4px' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-100">
        <InputBar />

        {/* Suggestions */}
        <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs" style={{ color: '#8F959E' }}>💡 猜你想问：</span>
          {suggestions.map(s => (
            <button
              key={s}
              className="text-xs px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'rgba(27,110,243,0.06)',
                color: '#1B6EF3',
              }}
              onClick={() => sendMessage(s)}
            >
              {normalizeCompanyNames(s)}
            </button>
          ))}
        </div>
      </div>

      {modelConfigOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="w-[460px] rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="text-base font-semibold" style={{ color: '#1F2329' }}>AI 模型配置</div>
                <div className="text-xs mt-1" style={{ color: '#8F959E' }}>配置 AI 模型以获得更智能的回答</div>
              </div>
              <button onClick={() => setModelConfigOpen(false)} className="p-1.5 rounded hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: '#8F959E' }} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>模型类型</label>
                <select
                  value={providerDraft}
                  onChange={(e) => setProviderDraft(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
                >
                  {providerOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {providerDraft === '本地规则' && (
                  <div className="text-xs mt-1" style={{ color: '#8F959E' }}>
                    选择本地规则将直接使用内置规则引擎回复，不依赖外部 AI 模型
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>API 地址</label>
                <input
                  value={baseUrlDraft}
                  onChange={(e) => setBaseUrlDraft(e.target.value)}
                  placeholder="例如：https://api.example.com/v1"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
                  disabled={providerDraft === '本地规则'}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>模型名称</label>
                <input
                  value={modelDraft}
                  onChange={(e) => setModelDraft(e.target.value)}
                  placeholder="例如：gpt-4o / qwen3.5-plus / claude-3-5-sonnet"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
                  disabled={providerDraft === '本地规则'}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A5A5A' }}>API Key</label>
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder="输入可用的 API Key"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
                  disabled={providerDraft === '本地规则'}
                />
              </div>

              <div className="text-xs rounded-lg px-3 py-3" style={{
                backgroundColor:
                  modelConnectionStatus === 'success' ? '#ECFDF5' :
                  modelConnectionStatus === 'error' ? '#FEF2F2' :
                  '#F8FAFC',
                color:
                  modelConnectionStatus === 'success' ? '#047857' :
                  modelConnectionStatus === 'error' ? '#B91C1C' :
                  '#64748B',
              }}>
                {modelConnectionMessage || '尚未测试连接。保存配置后建议先测试，再用于聊天。'}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setModelConfigOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                style={{ color: '#5A5A5A' }}
              >
                取消
              </button>
              <button
                onClick={handleTestConnection}
                className="px-4 py-2 rounded-lg border border-blue-200 text-sm hover:bg-blue-50"
                style={{ color: '#1B6EF3' }}
              >
                测试连接
              </button>
              <button
                onClick={handleSaveModelConfig}
                className="px-4 py-2 rounded-lg text-sm text-white"
                style={{ backgroundColor: '#1B6EF3' }}
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
