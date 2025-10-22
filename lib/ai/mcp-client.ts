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
  serverSessionId: string | null;
  messageEndpoint: string | null;
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
      if (session?.isConnected && session.messageEndpoint) {
        session.lastActivity = Date.now();
        return actualSessionId;
      }
    }

    const session: MCPSession = {
      id: actualSessionId,
      eventSource: null,
      isConnected: false,
      serverSessionId: null,
      messageEndpoint: null,
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
        // Close any existing event source before creating a new one
        if (session.eventSource) {
          session.eventSource.close();
        }

        const sseUrl = `${this.baseUrl}/sse`;
        const eventSource = new EventSource(sseUrl);
        session.eventSource = eventSource;
        session.isConnected = false;
        session.serverSessionId = null;
        session.messageEndpoint = null;

        let resolved = false;
        const maybeResolve = () => {
          if (!resolved && session.isConnected && session.messageEndpoint) {
            resolved = true;
            clearTimeout(initialTimeout);
            resolve();
          }
        };

        const initialTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            eventSource.close();
            reject(new Error('SSE connection timeout'));
          }
        }, 10000);

        eventSource.onopen = () => {
          console.log(`MCP SSE connected for session: ${session.id}`);
          session.isConnected = true;
          session.reconnectAttempts = 0;
          session.lastActivity = Date.now();
          maybeResolve();
        };

        eventSource.onmessage = (event: any) => {
          session.lastActivity = Date.now();
          try {
            const message: MCPMessage = JSON.parse(event.data);
            this.handleSSEMessage(session, message);
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
          }
        };

        eventSource.addEventListener('endpoint', (event: MessageEvent) => {
          const rawEndpoint = typeof event.data === 'string' ? event.data.trim() : '';
          if (!rawEndpoint) {
            return;
          }

          const endpointUrl = rawEndpoint.startsWith('http')
            ? rawEndpoint
            : `${this.baseUrl}${rawEndpoint.startsWith('/') ? '' : '/'}${rawEndpoint}`;

          session.messageEndpoint = endpointUrl;

          try {
            const parsed = new URL(endpointUrl, this.baseUrl);
            session.serverSessionId = parsed.searchParams.get('sessionId');
          } catch (error) {
            console.error('Failed to parse MCP endpoint URL:', error);
          }

          maybeResolve();
        });

        eventSource.onerror = (error: any) => {
          console.error(`MCP SSE error for session ${session.id}:`, error);
          session.isConnected = false;
          session.messageEndpoint = null;

          if (!resolved) {
            resolved = true;
            clearTimeout(initialTimeout);
            eventSource.close();
            reject(new Error('Failed to establish MCP SSE connection'));
            return;
          }

          if (session.reconnectAttempts < this.maxReconnectAttempts) {
            session.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, session.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${session.reconnectAttempts})`);

            setTimeout(() => {
              this.establishSSEConnection(session).catch(() => {
                // Reconnection failure will be surfaced by pending requests
              });
            }, delay);
          } else {
            eventSource.close();
            this.rejectPendingRequests(session, 'Max reconnection attempts reached');
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private rejectPendingRequests(session: MCPSession, reason: string): void {
    for (const [requestId, pendingRequest] of session.pendingRequests.entries()) {
      clearTimeout(pendingRequest.timeout);
      pendingRequest.reject(new Error(reason));
      session.pendingRequests.delete(requestId);
    }
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
    const endpoint = session.messageEndpoint;
    if (!endpoint) {
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

      const targetUrl = endpoint.startsWith('http')
        ? endpoint
        : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

      fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
    const endpoint = session.messageEndpoint;
    if (!endpoint) {
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

      const targetUrl = endpoint.startsWith('http')
        ? endpoint
        : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

      fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      this.rejectPendingRequests(session, 'Session disconnected');
      
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
      if (session?.isConnected && session.messageEndpoint) {
        session.lastActivity = Date.now();
        return sessionId;
      }
    }
    
    return this.connectSession(sessionId);
  }
}

// Export singleton instance
export const mcpClient = MCPClient.getInstance();
