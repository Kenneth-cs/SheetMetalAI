import { AgentRole } from './AgentAvatar';

export interface ViewBox {
  type: string;
  label: string;
  description: string;
  box: [number, number, number, number]; // [x, y, width, height] relative 0-1
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  agentRole?: AgentRole;
  content: string;
  timestamp: Date;
  status?: 'sending' | 'streaming' | 'complete';
  uiType?: 'view_confirmation' | 'default';
  metadata?: {
    confidence?: number;
    extractedParams?: Record<string, any>;
    isError?: boolean;
    views?: ViewBox[];
    imageData?: string;
  };
}

export interface AgentStatus {
  role: AgentRole;
  status: 'idle' | 'thinking' | 'working' | 'error';
  message?: string;
}

export interface WorkflowState {
  phase: 'idle' | 'uploading' | 'splitting' | 'extracting' | 'inspecting' | 'executing' | 'complete' | 'error';
  currentAgent?: AgentRole;
  progress?: number;
}
