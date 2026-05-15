import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Send, Paperclip, Mic } from 'lucide-react';

export default function InputBar() {
  const { inputValue, setInputValue, sendMessage, isTyping } = useAppStore();
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  const handleSend = () => {
    if (inputValue.trim() && !isTyping) {
      sendMessage(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`已选择附件：${file.name}\n当前版本先记录选择，后续可接入真实上传与上下文分析。`);
    e.target.value = '';
  };

  const handleVoiceClick = () => {
    alert('语音输入入口已预留。\n当前版本先保留交互，后续可接入浏览器录音或实时语音识别。');
  };

  return (
    <div className="px-5 py-3">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      <div
        className="flex items-end gap-2 rounded-xl px-4 py-2 transition-all duration-200"
        style={{
          backgroundColor: '#F5F7FA',
          border: isFocused ? '1px solid #1B6EF3' : '1px solid transparent',
          boxShadow: isFocused ? '0 0 0 2px rgba(27,110,243,0.1)' : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="输入您的问题..."
          rows={1}
          className="flex-1 bg-transparent border-none outline-none text-sm resize-none"
          style={{ color: '#1F2329', maxHeight: '120px' }}
        />
        <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
          <button className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="附件" onClick={handleAttachmentClick}>
            <Paperclip className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="语音" onClick={handleVoiceClick}>
            <Mic className="w-4 h-4" style={{ color: '#8F959E' }} />
          </button>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="p-1.5 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: inputValue.trim() && !isTyping ? '#1B6EF3' : '#E5E7EB',
              cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
            }}
            title="发送"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
