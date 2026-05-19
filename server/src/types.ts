export type AgentRole = 'controller' | 'splitter' | 'extractor' | 'inspector';
export type Intent = 'Greeting' | 'Chat' | 'AnalyzeDrawing' | 'ModifyParameter' | 'QueryData' | 'ConfirmView' | 'ModifyView';

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  agentRole?: AgentRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SSEEvent {
  type: 'agent_message' | 'agent_status' | 'workflow_update' | 'parameter_update' | 'error' | 'done';
  agent?: AgentRole;
  content?: string;
  status?: 'idle' | 'thinking' | 'working' | 'error';
  phase?: 'idle' | 'uploading' | 'splitting' | 'extracting' | 'inspecting' | 'executing' | 'complete' | 'error';
  metadata?: Record<string, any> & {
    rawPrompt?: string;
    rawResponse?: string;
  };
  params?: Record<string, any>;
}

export interface WorkflowState {
  phase: SSEEvent['phase'];
  currentAgent?: AgentRole;
  sessionId: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AgentContext {
  sessionId: string;
  userMessage: string;
  files: UploadedFile[];
  currentPhase: WorkflowState['phase'];
  extractedParams?: Record<string, any> | null;
  chatHistory?: ChatHistoryEntry[];
  inspectionResult?: {
    passed: boolean;
    issues: string[];
  };
}

export interface IntentResult {
  intent: Intent;
  reply: string;
  actionDetails?: {
    parameter: string;
    value: number | string;
    operation?: 'set' | 'increase' | 'decrease';
  };
}
