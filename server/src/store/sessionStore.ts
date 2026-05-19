export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type WorkflowPhase = 'idle' | 'waiting_confirmation' | 'extracting' | 'complete';

export interface WorkflowPendingState {
  phase: WorkflowPhase;
  splitterResult?: string;
  files?: Array<{
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  }>;
}

export interface Session {
  id: string;
  chatHistory: ChatHistoryEntry[];
  extractedParams: Record<string, any> | null;
  workflowState: WorkflowPendingState;
  createdAt: Date;
  lastActivity: Date;
}

class SessionStore {
  private sessions: Map<string, Session> = new Map();

  getOrCreate(sessionId: string): Session {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        chatHistory: [],
        extractedParams: null,
        workflowState: { phase: 'idle' },
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.sessions.set(sessionId, session);
    }
    session.lastActivity = new Date();
    return session;
  }

  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.getOrCreate(sessionId);
    session.chatHistory.push({
      role,
      content,
      timestamp: new Date(),
    });
    if (session.chatHistory.length > 20) {
      session.chatHistory = session.chatHistory.slice(-20);
    }
  }

  updateParams(sessionId: string, params: Record<string, any>): void {
    const session = this.getOrCreate(sessionId);
    session.extractedParams = params;
  }

  getParams(sessionId: string): Record<string, any> | null {
    const session = this.getOrCreate(sessionId);
    return session.extractedParams;
  }

  getHistory(sessionId: string): ChatHistoryEntry[] {
    const session = this.getOrCreate(sessionId);
    return session.chatHistory;
  }

  setWorkflowState(sessionId: string, state: WorkflowPendingState): void {
    const session = this.getOrCreate(sessionId);
    session.workflowState = state;
  }

  getWorkflowState(sessionId: string): WorkflowPendingState {
    const session = this.getOrCreate(sessionId);
    return session.workflowState;
  }

  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}

export const sessionStore = new SessionStore();
