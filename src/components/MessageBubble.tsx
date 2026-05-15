import { Bot, User } from 'lucide-react';
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
  const { sendMessage } = useAppStore();
  const isUser = message.role === 'user';

  const handleQuickAction = (_action: string, label: string) => {
    sendMessage(label);
  };

  return (
    <div className={`flex items-start gap-3 mb-5 ${isUser ? 'flex-row-reverse' : ''}`}>
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
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="px-4 py-3 rounded-xl text-sm leading-relaxed"
          style={
            isUser
              ? {
                  backgroundColor: '#1B6EF3',
                  color: '#FFFFFF',
                  borderTopRightRadius: '4px',
                }
              : {
                  backgroundColor: '#F5F7FA',
                  color: '#1F2329',
                  borderTopLeftRadius: '4px',
                }
          }
        >
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <MarkdownRenderer content={message.content} />
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
