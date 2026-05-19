import { useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import { Bot, ChevronDown, Clock3, Maximize2, Minimize2, Sparkles, X } from 'lucide-react';
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
    thinkingMessage,
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
  const [providerDraft, setProviderDraft] = useState('OpenAI / 兼容接口');
  const [baseUrlDraft, setBaseUrlDraft] = useState('https://code.fwind.work');
  const [modelDraft, setModelDraft] = useState('gpt-5.5');
  const [apiKeyDraft, setApiKeyDraft] = useState('sk-10f212a07f4d13cd0a024ce20f411fb04b6d7c9d76ca904767101dbefb4bd69b');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastAssistant = [...messages].reverse().find(msg => msg.role === 'assistant');
  const agentMeta = lastAssistant?.meta;
  const activeSource = agentEnabled && runtimeConfig && !lastAgentError
    ? 'agent'
    : agentMeta?.source;
  const activeModel = agentMeta?.model || runtimeConfig?.model || modelProviderLabel || 'OpenAI';
  const coachBadge = agentMeta?.coachMode ? `Coach · ${agentMeta.coachMode}` : null;
  const showAgentTimer = Boolean(thinkingMessage || (isTyping && agentEnabled));

  // 初始化时从 store 同步配置到 draft（不再覆盖默认值）
  useEffect(() => {
    setProviderDraft(modelProviderLabel);
    setBaseUrlDraft(runtimeConfig?.baseUrl || '');
    setModelDraft(runtimeConfig?.model || '');
    setApiKeyDraft(runtimeConfig?.apiKey || '');
  }, [modelProviderLabel, runtimeConfig]);

  useEffect(() => {
    // 只有当本地没有配置且 store 也没有正确配置时才尝试从 localStorage 恢复
    const raw = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY);
    if (!raw) return;
    if (runtimeConfig?.apiKey) return; // 已有配置，跳过
    try {
      const saved = JSON.parse(raw);
      if (saved?.provider) setModelProviderLabel(saved.provider);
      if (saved?.runtimeConfig) setRuntimeConfig(saved.runtimeConfig);
    } catch {
      // ignore invalid local cache
    }
  }, [setModelProviderLabel, setRuntimeConfig, runtimeConfig]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceToBottom < 180) {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages.length, thinkingMessage?.content, isTyping]);

  useEffect(() => {
    if (!thinkingMessage) {
      setThinkingStartedAt(null);
      setElapsedSeconds(0);
      return;
    }
    if (!thinkingStartedAt) {
      setThinkingStartedAt(Date.now());
      setElapsedSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - thinkingStartedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [thinkingMessage, thinkingStartedAt]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openModelConfig = () => {
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
    <div
      className={`flex flex-col bg-white ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full rounded-lg'}`}
      style={{
        boxShadow: isFullscreen ? '0 24px 80px rgba(15,23,42,0.24)' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
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
              backgroundColor: activeSource === 'agent' ? 'rgba(82,196,26,0.12)' : 'rgba(245,166,35,0.12)',
              color: activeSource === 'agent' ? '#389E0D' : '#D48806',
            }}
          >
            {activeSource === 'agent'
              ? `AI · ${activeModel}`
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
          {showAgentTimer && (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
              title="Agent 正在生成回答"
            >
              <Clock3 className="w-3 h-3" />
              思考 {elapsedSeconds}s
            </span>
          )}
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: '#5A5A5A' }}
            title={isFullscreen ? '退出全屏' : '放大全屏'}
            aria-label={isFullscreen ? '退出全屏' : '放大全屏'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: '#5A5A5A' }}
          >
            <Sparkles className="w-3 h-3" style={{ color: '#1B6EF3' }} />
            {activeSource === 'agent' ? '切换模型' : '启用 AI'}
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
        className={`flex-1 overflow-y-auto px-5 py-4 ${isFullscreen ? 'mx-auto w-full max-w-[1180px]' : ''}`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* 流式思考消息 */}
        {thinkingMessage && (
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1B6EF3, #7C3AED)' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-xl max-w-[80%] border" style={{ backgroundColor: '#F8FAFC', borderColor: '#E1E7EF', borderTopLeftRadius: '4px' }}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#1B6EF3' }}>思考中</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                  已用时 {elapsedSeconds}s
                </span>
              </div>
              <div className="text-sm font-semibold" style={{ color: '#1F2329' }}>
                {thinkingMessage.content || '正在分析问题并准备回答...'}
              </div>
              <div className="text-xs mt-1" style={{ color: '#8F959E' }}>
                {thinkingMessage.content?.includes('组织最终答案')
                  ? '正在整合客户、商机、知识库和话术，最终答案生成后会显示为回答卡片'
                  : '这里展示当前处理步骤，完整回答会在生成完成后展示'}
              </div>
              {elapsedSeconds >= 8 && (
                <div className="text-xs mt-2 rounded-md px-2 py-1.5" style={{ backgroundColor: '#FFF7ED', color: '#9A3412' }}>
                  正在深化客户洞察、知识库匹配和可复制话术。
                </div>
              )}
              {thinkingMessage.thinkingSteps && thinkingMessage.thinkingSteps.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs mb-2" style={{ color: '#8F959E' }}>处理轨迹</div>
                  <div className="space-y-1.5">
                    {thinkingMessage.thinkingSteps.slice(-4).map((step, idx, visibleSteps) => {
                      const isCurrent = idx === visibleSteps.length - 1;
                      return (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-md px-2 py-1.5"
                        style={{
                          backgroundColor: isCurrent ? 'rgba(27,110,243,0.08)' : 'transparent',
                        }}
                      >
                        <span
                          className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: isCurrent ? '#1B6EF3' : '#CBD5E1' }}
                        />
                        <span
                          className="text-xs leading-relaxed"
                          style={{ color: isCurrent ? '#1B6EF3' : '#64748B', fontWeight: isCurrent ? 600 : 400 }}
                        >
                          {step}
                        </span>
                      </div>
                    )})}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 普通加载指示器 */}
        {isTyping && !thinkingMessage && (
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
        <div className={isFullscreen ? 'mx-auto w-full max-w-[1180px]' : ''}>
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
