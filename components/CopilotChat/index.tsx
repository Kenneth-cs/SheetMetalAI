import React, { useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { WorkflowIndicator } from './WorkflowIndicator';
import { useSSEConnection } from './useSSEConnection';

export interface ViewCropData {
  imageData: string;
  views: Array<{
    type: string;
    label: string;
    box: [number, number, number, number];
  }>;
}

interface CopilotChatProps {
  onParamsUpdate?: (params: Record<string, any>) => void;
  onAdjustView?: (data?: ViewCropData) => void;
  onCropConfirm?: (sessionId: string, confirmViews: (files: File[]) => Promise<void>) => void;
  onSendMessageReady?: (sendMessage: (content: string) => void) => void;
  onSystemMessageReady?: (addSysMsg: (content: string, isError?: boolean) => void) => void;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({ onParamsUpdate, onAdjustView, onCropConfirm, onSendMessageReady, onSystemMessageReady }) => {
  const { messages, agentStatuses, workflow, isProcessing, currentParams, sessionId, sendMessage, confirmViews, addSystemMessage } = useSSEConnection();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastViewDataRef = useRef<ViewCropData | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentParams && onParamsUpdate) {
      onParamsUpdate(currentParams);
    }
  }, [currentParams, onParamsUpdate]);

  useEffect(() => {
    if (onCropConfirm) {
      onCropConfirm(sessionId, confirmViews);
    }
  }, [sessionId, confirmViews, onCropConfirm]);

  useEffect(() => {
    if (onSendMessageReady) {
      const sendMessageWrapper = (content: string) => {
        sendMessage(content);
      };
      onSendMessageReady(sendMessageWrapper);
    }
  }, [onSendMessageReady, sendMessage]);

  useEffect(() => {
    if (onSystemMessageReady) {
      onSystemMessageReady(addSystemMessage);
    }
  }, [onSystemMessageReady, addSystemMessage]);

  const handleConfirmView = useCallback(() => {
    sendMessage('确认');
  }, [sendMessage]);

  const handleAdjustView = useCallback((data?: ViewCropData) => {
    if (data) {
      lastViewDataRef.current = data;
    }
    if (onAdjustView) {
      onAdjustView(data || lastViewDataRef.current || undefined);
    }
  }, [onAdjustView]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
      <div className="p-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-200">AI 工程团队</h2>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          上传图纸或输入指令，AI团队将实时协作
        </p>
      </div>

      <WorkflowIndicator workflow={workflow} agentStatuses={agentStatuses} />

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">🏗️</div>
            <p className="text-sm text-slate-400 mb-1">欢迎使用 SheetMetalAI</p>
            <p className="text-xs text-slate-600">
              拖放图纸或输入指令开始
            </p>
            <div className="mt-4 space-y-2 text-[11px] text-left w-full max-w-[250px]">
              <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                <span className="text-industrial-400">💬</span> "你好" - 日常聊天
              </div>
              <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                <span className="text-industrial-400">📐</span> 上传图纸 - 分析零件
              </div>
              <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                <span className="text-industrial-400">✏️</span> "板厚改成2mm" - 修改参数
              </div>
              <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                <span className="text-industrial-400">❓</span> "宽度是多少" - 查询数据
              </div>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage 
            key={msg.id} 
            message={msg}
            onConfirmView={handleConfirmView}
            onAdjustView={handleAdjustView}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSendMessage={sendMessage}
        disabled={false}
        isProcessing={isProcessing}
      />
    </div>
  );
};
