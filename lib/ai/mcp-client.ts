import { EventSource } from 'eventsource';

export interface MCPMessage {
  jsonrpc: '2.0';
  id: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
}

interface MCPSession {
  id: string;
  eventSource: EventSource | null;
  isConnected: boolean;
  pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }>;
  reconnectAttempts: number;
  lastActivity: number;
}

export class MCPClient {
  private static instance: MCPClient;
  private sessions: Map<string, MCPSession> = new Map();
  private readonly baseUrl = 'https://hono-mcp-demo.justincourse.site';
  private readonly maxReconnectAttempts = 5;
  private readonly requestTimeout = 30000; // 30 seconds
  private readonly sessionTimeout = 300000; // 5 minutes

  private constructor() {
    // Cleanup inactive sessions every minute
    setInterval(() => this.cleanupInactiveSessions(), 60000);
  }

  public static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.disconnectSession(sessionId);
      }
    }
  }

  private generateSessionId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public async connectSession(sessionId?: string): Promise<string> {
    const actualSessionId = sessionId || this.generateSessionId();
    
    if (this.sessions.has(actualSessionId)) {
      const session = this.sessions.get(actualSessionId);
      if (session?.isConnected) {
        session.lastActivity = Date.now();
        return actualSessionId;
      }
    }

    const session: MCPSession = {
      id: actualSessionId,
      eventSource: null,
      isConnected: false,
      pendingRequests: new Map(),
      reconnectAttempts: 0,
      lastActivity: Date.now()
    };

    this.sessions.set(actualSessionId, session);

    try {
      await this.establishSSEConnection(session);
      return actualSessionId;
    } catch (error) {
      this.sessions.delete(actualSessionId);
      throw new Error(`Failed to establish MCP connection: ${error}`);
    }
  }

  private async establishSSEConnection(session: MCPSession): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 根据 MCP 规范，SSE 连接通常需要身份验证或会话参数
        const sseUrl = `${this.baseUrl}/sse?session=${session.id}`;
        
        session.eventSource = new EventSource(sseUrl);

        session.eventSource.onopen = () => {
          console.log(`MCP SSE connected for session: ${session.id}`);
          session.isConnected = true;
          session.reconnectAttempts = 0;
          session.lastActivity = Date.now();
          resolve();
        };

        session.eventSource.onmessage = (event: any) => {
          try {
            const message: MCPMessage = JSON.parse(event.data);
            this.handleSSEMessage(session, message);
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
          }
        };

        session.eventSource.onerror = (error: any) => {
          console.error(`MCP SSE error for session ${session.id}:`, error);
          session.isConnected = false;
          
          if (session.reconnectAttempts < this.maxReconnectAttempts) {
            session.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, session.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${session.reconnectAttempts})`);
            
            setTimeout(() => {
              this.establishSSEConnection(session).catch(() => {
                // Reconnection failed, will be handled by the next error event
              });
            }, delay);
          } else {
            reject(new Error('Max reconnection attempts reached'));
          }
        };

        // Timeout for initial connection
        setTimeout(() => {
          if (!session.isConnected) {
            reject(new Error('SSE connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleSSEMessage(session: MCPSession, message: MCPMessage): void {
    session.lastActivity = Date.now();

    // Handle responses to pending requests
    if (message.id !== undefined && session.pendingRequests.has(message.id)) {
      const pendingRequest = session.pendingRequests.get(message.id);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        session.pendingRequests.delete(message.id);

        if (message.error) {
          pendingRequest.reject(new Error(message.error.message));
        } else {
          pendingRequest.resolve(message.result);
        }
      }
    }

    // Handle server-initiated messages (notifications)
    if (message.method) {
      console.log(`Received MCP notification: ${message.method}`, message.params);
    }
  }

  public async callTool(
    sessionId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isConnected) {
      throw new Error(`No active MCP session found: ${sessionId}`);
    }

    const requestId = this.generateRequestId();
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        session.pendingRequests.delete(requestId);
        reject(new Error(`MCP tool call timeout: ${toolName}`));
      }, this.requestTimeout);

      // Store pending request
      session.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout
      });

      // Send via HTTP POST since SSE is read-only
      fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MCP-Session': sessionId
        },
        body: JSON.stringify(message)
      }).catch((error) => {
        clearTimeout(timeout);
        session.pendingRequests.delete(requestId);
        reject(new Error(`Failed to send MCP request: ${error.message}`));
      });
    });
  }

  public async listTools(sessionId: string): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isConnected) {
      throw new Error(`No active MCP session found: ${sessionId}`);
    }

    const requestId = this.generateRequestId();
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/list'
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        session.pendingRequests.delete(requestId);
        reject(new Error('MCP tools list timeout'));
      }, this.requestTimeout);

      session.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout
      });

      fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MCP-Session': sessionId
        },
        body: JSON.stringify(message)
      }).catch((error) => {
        clearTimeout(timeout);
        session.pendingRequests.delete(requestId);
        reject(new Error(`Failed to list MCP tools: ${error.message}`));
      });
    });
  }

  public disconnectSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.eventSource) {
        session.eventSource.close();
      }
      
      // Reject all pending requests
      for (const [requestId, pendingRequest] of session.pendingRequests) {
        clearTimeout(pendingRequest.timeout);
        pendingRequest.reject(new Error('Session disconnected'));
      }
      
      this.sessions.delete(sessionId);
      console.log(`MCP session disconnected: ${sessionId}`);
    }
  }

  public getSessionStatus(sessionId: string): { connected: boolean; lastActivity: number } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    return {
      connected: session.isConnected,
      lastActivity: session.lastActivity
    };
  }

  public async ensureConnection(sessionId?: string): Promise<string> {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId);
      if (session?.isConnected) {
        session.lastActivity = Date.now();
        return sessionId;
      }
    }
    
    return this.connectSession(sessionId);
  }
}

// Export singleton instance
export const mcpClient = MCPClient.getInstance();