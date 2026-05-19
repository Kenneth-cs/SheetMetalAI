import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, AgentStatus, WorkflowState } from './types';
import { AgentRole } from './AgentAvatar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function generateSessionId(): string {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15);
}

interface SSEEvent {
  type: 'agent_message' | 'agent_status' | 'workflow_update' | 'parameter_update' | 'error' | 'done';
  agent?: AgentRole;
  content?: string;
  status?: AgentStatus['status'];
  phase?: WorkflowState['phase'];
  metadata?: Record<string, any>;
  params?: Record<string, any>;
}

export interface UseSSEConnectionReturn {
  messages: ChatMessage[];
  agentStatuses: AgentStatus[];
  workflow: WorkflowState;
  isProcessing: boolean;
  currentParams: Record<string, any> | null;
  sessionId: string;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  confirmViews: (files: File[]) => Promise<void>;
}

export function useSSEConnection(): UseSSEConnectionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([
    { role: 'controller', status: 'idle' },
    { role: 'splitter', status: 'idle' },
    { role: 'extractor', status: 'idle' },
    { role: 'inspector', status: 'idle' },
  ]);
  const [workflow, setWorkflow] = useState<WorkflowState>({ phase: 'idle' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentParams, setCurrentParams] = useState<Record<string, any> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMsg]);
    return newMsg.id;
  }, []);

  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'agent_message':
          if (event.agent) {
            const isViewConfirmation = event.metadata?.uiType === 'view_confirmation';
            addMessage({
              role: 'agent',
              agentRole: event.agent,
              content: event.content || '',
              status: 'complete',
              uiType: isViewConfirmation ? 'view_confirmation' : 'default',
              metadata: event.metadata,
            });
          }
          break;

        case 'agent_status':
          if (event.agent && event.status) {
            setAgentStatuses(prev =>
              prev.map(a =>
                a.role === event.agent
                  ? { ...a, status: event.status as AgentStatus['status'], message: event.content }
                  : a
              )
            );
          }
          break;

        case 'workflow_update':
          if (event.phase) {
            setWorkflow({
              phase: event.phase,
              currentAgent: event.agent,
              progress: event.metadata?.progress,
            });
          }
          break;

        case 'parameter_update':
          if (event.params) {
            setCurrentParams(event.params);
            addMessage({
              role: 'system',
              content: '参数已更新，请查看左侧结果。',
              metadata: { extractedParams: event.params },
            });
          }
          break;

        case 'error':
          addMessage({
            role: 'system',
            content: `错误: ${event.content || '未知错误'}`,
            metadata: { isError: true },
          });
          break;

        case 'done':
          setIsProcessing(false);
          setWorkflow(prev => ({ ...prev, phase: 'complete' }));
          break;
      }
    },
    [addMessage]
  );

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sessionId = sessionIdRef.current;
    const es = new EventSource(`${API_BASE_URL}/api/agent/stream/${sessionId}`);

    es.onopen = () => {
      console.log('SSE connected:', sessionId);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SSEEvent;
        handleSSEEvent(data);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE connection error:', err);
      es.close();
      eventSourceRef.current = null;
    };

    eventSourceRef.current = es;
  }, [handleSSEEvent]);

  useEffect(() => {
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectSSE]);

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      setIsProcessing(true);

      addMessage({
        role: 'user',
        content: content || '分析图纸',
        status: 'complete',
      });

      try {
        const formData = new FormData();
        formData.append('message', content);
        formData.append('sessionId', sessionIdRef.current);

        if (files) {
          files.forEach(file => {
            formData.append('files', file);
          });
        }

        const response = await fetch(`${API_BASE_URL}/api/agent/chat`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

      } catch (error: any) {
        addMessage({
          role: 'system',
          content: `发送失败: ${error.message}`,
          metadata: { isError: true },
        });
        setIsProcessing(false);
        setWorkflow({ phase: 'error' });
      }
    },
    [addMessage]
  );

  const confirmViews = useCallback(
    async (files: File[]) => {
      setIsProcessing(true);

      addMessage({
        role: 'system',
        content: '已确认视图，正在提取参数...',
        status: 'complete',
      });

      try {
        const formData = new FormData();
        formData.append('sessionId', sessionIdRef.current);

        files.forEach(file => {
          formData.append('files', file);
        });

        const response = await fetch(`${API_BASE_URL}/api/agent/confirm-views`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

      } catch (error: any) {
        addMessage({
          role: 'system',
          content: `确认视图失败: ${error.message}`,
          metadata: { isError: true },
        });
        setIsProcessing(false);
        setWorkflow({ phase: 'error' });
      }
    },
    [addMessage]
  );

  return {
    messages,
    agentStatuses,
    workflow,
    isProcessing,
    currentParams,
    sessionId: sessionIdRef.current,
    sendMessage,
    confirmViews,
  };
}
