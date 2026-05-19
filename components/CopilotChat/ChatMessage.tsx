import React from 'react';
import { AgentAvatar, AgentRole, getAgentConfig } from './AgentAvatar';
import { ChatMessage as ChatMessageType, ViewBox } from './types';

export interface ViewCropData {
  imageData: string;
  views: Array<{
    type: string;
    label: string;
    box: [number, number, number, number];
  }>;
}

interface ChatMessageProps {
  message: ChatMessageType;
  onConfirmView?: () => void;
  onAdjustView?: (data?: ViewCropData) => void;
}

const ViewConfirmationCard: React.FC<{
  views: ViewBox[];
  imageData: string;
  onConfirm: () => void;
  onAdjust: (data?: ViewCropData) => void;
}> = ({ views, imageData, onConfirm, onAdjust }) => {
  const handleAdjust = () => {
    onAdjust({
      imageData,
      views: views.map(v => ({
        type: v.type,
        label: v.label,
        box: v.box,
      })),
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <div className="p-2 bg-slate-700/50 border-b border-slate-700">
        <div className="text-xs font-medium text-slate-300">视图识别结果</div>
      </div>
      
      <div className="relative">
        <img 
          src={imageData} 
          alt="图纸" 
          className="w-full h-auto max-h-[200px] object-contain bg-white"
        />
        
        {views.map((view, index) => {
          const [x, y, w, h] = view.box;
          const colors = ['border-blue-400', 'border-green-400', 'border-amber-400', 'border-purple-400'];
          const color = colors[index % colors.length];
          
          return (
            <div
              key={index}
              className={`absolute border-2 ${color} bg-blue-500/10`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${w * 100}%`,
                height: `${h * 100}%`,
              }}
            >
              <div className={`absolute -top-5 left-0 text-[10px] px-1 py-0.5 rounded ${color.replace('border', 'bg')} text-white`}>
                {view.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 space-y-2">
        <div className="text-xs text-slate-400">
          已识别 {views.length} 个视图：
        </div>
        {views.map((view, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-slate-300">{view.label}</span>
            <span className="text-slate-500">- {view.description}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-3 border-t border-slate-700">
        <button
          onClick={onConfirm}
          className="flex-1 px-3 py-2 bg-industrial-600 hover:bg-industrial-500 text-white text-xs font-medium rounded transition-colors"
        >
          ✓ 确认并继续提取
        </button>
        <button
          onClick={handleAdjust}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors"
        >
          ✏️ 调整位置
        </button>
      </div>
    </div>
  );
};

const TraceabilityPanel: React.FC<{ rawPrompt?: string; rawResponse?: string }> = ({ rawPrompt, rawResponse }) => {
  if (!rawPrompt && !rawResponse) return null;

  return (
    <details className="mt-2 group">
      <summary className="text-[10px] text-slate-500 hover:text-slate-400 cursor-pointer flex items-center gap-1 select-none">
        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>AI 思考过程 (Traceability)</span>
      </summary>
      <div className="mt-1 space-y-2 max-h-[300px] overflow-y-auto">
        {rawPrompt && (
          <div>
            <div className="text-[10px] font-medium text-slate-500 mb-0.5">📝 原始 Prompt:</div>
            <pre className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {rawPrompt}
            </pre>
          </div>
        )}
        {rawResponse && (
          <div>
            <div className="text-[10px] font-medium text-slate-500 mb-0.5">🤖 原始 Response:</div>
            <pre className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {rawResponse}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onConfirmView, onAdjustView }) => {
  const isUser = message.role === 'user';
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';
  const isViewConfirmation = message.uiType === 'view_confirmation' && message.metadata?.views;

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  if (isViewConfirmation && message.metadata?.views && message.metadata?.imageData) {
    return (
      <div className="flex gap-2 flex-row">
        <AgentAvatar role="splitter" size="sm" />
        <div className="max-w-[90%]">
          <ViewConfirmationCard
            views={message.metadata.views}
            imageData={message.metadata.imageData}
            onConfirm={onConfirmView || (() => {})}
            onAdjust={onAdjustView || (() => {})}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {isAgent && message.agentRole && (
        <AgentAvatar role={message.agentRole} size="sm" />
      )}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-industrial-600 text-white'
            : isAgent && message.agentRole
            ? `${getAgentConfig(message.agentRole).bgColor} border border-slate-700`
            : 'bg-slate-800 border border-slate-700'
        }`}
      >
        {isAgent && message.agentRole && (
          <div className={`text-xs font-medium mb-1 ${getAgentConfig(message.agentRole).color}`}>
            {getAgentConfig(message.agentRole).name}
          </div>
        )}
        <div className="text-sm text-slate-200 whitespace-pre-wrap">{message.content}</div>
        {message.status === 'streaming' && (
          <div className="flex gap-1 mt-1">
            <div className="w-1.5 h-1.5 bg-industrial-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-industrial-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-industrial-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {message.metadata?.confidence !== undefined && (
          <div className="mt-1 text-xs text-slate-400">
            置信度: {(message.metadata.confidence * 100).toFixed(0)}%
          </div>
        )}
        {message.metadata?.images && message.metadata.images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.metadata.images.map((img, idx) => (
              <img key={idx} src={img} alt="cropped view" className="w-24 h-24 object-cover rounded border border-slate-600 bg-white" />
            ))}
          </div>
        )}
        {(message.metadata?.rawPrompt || message.metadata?.rawResponse) && (
          <TraceabilityPanel 
            rawPrompt={message.metadata.rawPrompt} 
            rawResponse={message.metadata.rawResponse} 
          />
        )}
      </div>
    </div>
  );
};
