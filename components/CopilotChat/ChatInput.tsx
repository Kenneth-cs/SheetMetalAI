import React, { useState, useRef, useCallback } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  isProcessing = false,
}) => {
  const [message, setMessage] = useState('');
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(f =>
      f.type.startsWith('image/') ||
      f.name.toLowerCase().endsWith('.pdf') ||
      f.name.toLowerCase().endsWith('.dxf')
    );

    if (validFiles.length > 0) {
      setDraggedFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDraggedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setDraggedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed && draggedFiles.length === 0) return;
    if (disabled || isProcessing) return;

    onSendMessage(trimmed, draggedFiles.length > 0 ? draggedFiles : undefined);
    setMessage('');
    setDraggedFiles([]);
  }, [message, draggedFiles, disabled, isProcessing, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="border-t border-slate-700 bg-slate-900 p-3">
      {draggedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {draggedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-slate-800 rounded px-2 py-1 text-xs text-slate-300"
            >
              <span className="truncate max-w-[100px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-slate-500 hover:text-red-400"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`relative rounded-lg border transition-colors ${
          isDragging
            ? 'border-industrial-400 bg-industrial-900/20'
            : 'border-slate-700 bg-slate-800'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-industrial-900/40 rounded-lg z-10">
            <div className="text-industrial-400 text-sm font-medium">
              拖放图纸到此处
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入指令，或拖放图纸开始分析..."
          disabled={disabled || isProcessing}
          className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none p-3 pr-20 focus:outline-none min-h-[60px] max-h-[120px]"
          rows={2}
        />

        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="p-1.5 text-slate-500 hover:text-industrial-400 transition-colors"
            title="上传图纸"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <button
            onClick={handleSubmit}
            disabled={disabled || isProcessing || (!message.trim() && draggedFiles.length === 0)}
            className={`p-1.5 rounded transition-colors ${
              message.trim() || draggedFiles.length > 0
                ? 'text-industrial-400 hover:bg-industrial-900/30'
                : 'text-slate-600'
            }`}
          >
            {isProcessing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.dxf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="mt-2 text-[10px] text-slate-600 text-center">
        按 Enter 发送，Shift+Enter 换行 · 支持拖放图片/PDF/DXF
      </div>
    </div>
  );
};
