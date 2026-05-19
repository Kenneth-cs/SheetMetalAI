import { Response } from 'express';
import { SSEEvent, AgentRole } from './types.js';

class SSEManager {
  private clients: Map<string, Response> = new Map();

  addClient(sessionId: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
    this.clients.set(sessionId, res);
  }

  removeClient(sessionId: string): void {
    this.clients.delete(sessionId);
  }

  hasClient(sessionId: string): boolean {
    return this.clients.has(sessionId);
  }

  sendEvent(sessionId: string, event: SSEEvent): boolean {
    const client = this.clients.get(sessionId);
    if (!client) {
      return false;
    }

    try {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
      return true;
    } catch (err) {
      console.error(`Failed to send SSE event to ${sessionId}:`, err);
      this.removeClient(sessionId);
      return false;
    }
  }

  sendMessage(sessionId: string, agent: AgentRole, content: string): void {
    this.sendEvent(sessionId, {
      type: 'agent_message',
      agent,
      content,
    });
  }

  updateStatus(sessionId: string, agent: AgentRole, status: SSEEvent['status'], message?: string): void {
    this.sendEvent(sessionId, {
      type: 'agent_status',
      agent,
      status,
      content: message,
    });
  }

  updateWorkflow(sessionId: string, phase: SSEEvent['phase'], agent?: AgentRole): void {
    this.sendEvent(sessionId, {
      type: 'workflow_update',
      phase,
      agent,
    });
  }

  sendParameterUpdate(sessionId: string, params: Record<string, any>): void {
    this.sendEvent(sessionId, {
      type: 'parameter_update',
      params,
    });
  }

  sendError(sessionId: string, message: string): void {
    this.sendEvent(sessionId, {
      type: 'error',
      content: message,
    });
  }

  sendDone(sessionId: string): void {
    this.sendEvent(sessionId, {
      type: 'done',
    });
  }
}

export const sseManager = new SSEManager();
