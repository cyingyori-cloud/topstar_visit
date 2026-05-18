import { useMemo, useState } from 'react';
import { Bot, Check, Copy, Maximize2, Minimize2, Star, ThumbsUp, User } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickActions?: { label: string; icon: string; action: string }[];
  meta?: {
    model?: string;
    toolCalls?: string[];
    source?: 'agent' | 'fallback';
    coachRole?: string | null;
    coachMode?: string | null;
    coachDataLevel?: string | null;
    provider?: string | null;
    apiMode?: string | null;
    endpoint?: string | null;
  };
}

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const {
    sendMessage,
    rateAnswer,
    saveAnswer,
    saveCustomerMemoryFromAnswer,
    answerFeedback,
    savedAnswers,
    selectedCustomer,
    customerMemory,
  } = useAppStore();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const feedbackValue = answerFeedback[message.id]?.value;
  const isSaved = savedAnswers.some(item => item.id === message.id);
  const hasMemory = customerMemory.some(item => item.sourceMessageId === message.id && item.customerId === selectedCustomer?.id);
  const isLongAssistantMessage = useMemo(
    () => !isUser && (message.content.length > 1200 || message.content.split('\n').length > 18),
    [isUser, message.content],
  );

  const handleQuickAction = (_action: string, label: string) => {
    sendMessage(label);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleRate = () => {
    rateAnswer(message.id, 'up');
  };

  const handleSaveAnswer = () => {
    saveAnswer(message.id);
  };

  const handleSaveMemory = () => {
    saveCustomerMemoryFromAnswer(message.id);
  };

  return (
    <div className={`group flex items-start gap-3 mb-5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1B6EF3' }}>
          <User className="w-4 h-4 text-white" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1B6EF3, #7C3AED)' }}>
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Content */}
      <div className={`${isUser ? 'max-w-[85%] items-end' : 'min-w-0 flex-1 items-start'}`}>
        <div
          className={`relative rounded-xl text-sm leading-relaxed ${isUser ? 'px-4 py-3' : 'px-4 pb-4 pt-3 border'}`}
          style={
            isUser
              ? {
                  backgroundColor: '#1B6EF3',
                  color: '#FFFFFF',
                  borderTopRightRadius: '4px',
                }
              : {
                  backgroundColor: '#FFFFFF',
                  color: '#1F2329',
                  borderTopLeftRadius: '4px',
                  borderColor: '#E1E7EF',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
                }
          }
        >
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <>
              <div className="sticky top-0 z-10 -mx-4 -mt-3 mb-3 flex items-center justify-between rounded-tr-xl border-b border-gray-100 bg-white/95 px-4 py-2 backdrop-blur">
                <div className="text-xs font-medium" style={{ color: '#64748B' }}>
                  回答内容
                </div>
                <div className="flex items-center gap-1">
                  {isLongAssistantMessage && (
                    <button
                      type="button"
                      onClick={() => setExpanded(!expanded)}
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-gray-100"
                      style={{ color: '#475569' }}
                    >
                      {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      {expanded ? '收起' : '展开'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-gray-100"
                    style={{ color: copied ? '#047857' : '#475569' }}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRate}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-gray-100"
                    style={{ color: feedbackValue === 'up' ? '#047857' : '#475569' }}
                    title={feedbackValue === 'up' ? '取消有用反馈' : '标记为有用'}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {feedbackValue === 'up' ? '已标记有用' : '有用？'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAnswer}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-gray-100"
                    style={{ color: isSaved ? '#B45309' : '#475569' }}
                    title={isSaved ? '取消收藏' : '收藏答案'}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {isSaved ? '已收藏' : '收藏'}
                  </button>
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={handleSaveMemory}
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-gray-100"
                      style={{ color: hasMemory ? '#1B6EF3' : '#475569' }}
                      title={hasMemory ? '取消客户沉淀' : '沉淀到当前客户'}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {hasMemory ? '已沉淀' : '沉淀客户'}
                    </button>
                  )}
                </div>
              </div>
              <div className={`assistant-answer ${isLongAssistantMessage && !expanded ? 'max-h-[520px] overflow-hidden' : ''}`}>
                <MarkdownRenderer content={message.content} />
              </div>
              {isLongAssistantMessage && !expanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-xl bg-gradient-to-t from-white to-transparent" />
              )}
              {isLongAssistantMessage && !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs shadow-sm hover:bg-blue-50"
                  style={{ color: '#1B6EF3' }}
                >
                  展开完整回答
                </button>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        {message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleQuickAction(action.action, action.label)}
                className="inline-flex items-center text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200 hover:shadow-sm"
                style={{
                  borderColor: 'rgba(27,110,243,0.3)',
                  color: '#1B6EF3',
                  backgroundColor: 'rgba(27,110,243,0.04)',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
