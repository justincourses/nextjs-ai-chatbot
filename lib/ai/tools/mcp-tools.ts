import { tool } from 'ai';
import { z } from 'zod';
import { mcpClient, type MCPToolResult } from '../mcp-client';

let sharedSessionId: string | null = null;

async function getOrCreateSession(): Promise<string> {
  if (sharedSessionId) {
    const status = mcpClient.getSessionStatus(sharedSessionId);
    if (status?.connected) {
      return sharedSessionId;
    }
  }

  sharedSessionId = await mcpClient.ensureConnection(sharedSessionId ?? undefined);
  return sharedSessionId;
}

async function callMCPTool(toolName: string, parameters: Record<string, any>): Promise<MCPToolResult | { error: true; message: string }> {
  try {
    const sessionId = await getOrCreateSession();
    return await mcpClient.callTool(sessionId, toolName, parameters);
  } catch (error) {
    console.error(`Failed to call MCP tool ${toolName}:`, error);

    // Force a fresh session on next attempt
    if (sharedSessionId) {
      mcpClient.disconnectSession(sharedSessionId);
      sharedSessionId = null;
    }

    return {
      error: true,
      message: '服务暂时不可用，请稍后重试或访问官方网站：https://justincourse.com'
    };
  }
}

// MCP Tool: how_to_use - Get guidance on using MCP tools
export const howToUse = tool({
  description: 'Get detailed guidance on how to use JustinCourse MCP tools effectively. Call this FIRST when users ask about JustinCourse to understand the best search strategy.',
  parameters: z.object({
    userQuery: z.string().describe('The original user query about JustinCourse')
  }),
  execute: async ({ userQuery }) => {
    const result = await callMCPTool('how_to_use', { userQuery });
    return result;
  },
});

// MCP Tool: search_knowledge_base - Search both WordPress and FAQ content  
export const searchKnowledgeBase = tool({
  description: 'Search JustinCourse knowledge base including WordPress posts and FAQ documents. Use after calling howToUse for guidance.',
  parameters: z.object({
    keywords: z.string().describe('Search keywords'),
    sources: z.enum(['all', 'wordpress', 'faq']).optional().default('all').describe('Search sources: all (both), wordpress (technical tutorials), faq (common questions)'),
    max_results: z.number().optional().default(5).describe('Maximum number of results to return')
  }),
  execute: async ({ keywords, sources = 'all', max_results = 5 }) => {
    const result = await callMCPTool('search_knowledge_base', {
      keywords,
      sources,
      max_results
    });
    return result;
  },
});

// MCP Tool: search_wordpress_posts - Search detailed course content and tutorials
export const searchWordPressPosts = tool({
  description: 'Search detailed course content and technical tutorials from WordPress. Use for specific technical topics.',
  parameters: z.object({
    keywords: z.string().describe('Course or technical keywords'),
    per_page: z.number().optional().default(8).describe('Number of posts per page')
  }),
  execute: async ({ keywords, per_page = 8 }) => {
    const result = await callMCPTool('search_wordpress_posts', {
      keywords,
      per_page
    });
    return result;
  },
});

// MCP Tool: list_faq_documents - List FAQ documents
export const listFaqDocuments = tool({
  description: 'List available FAQ documents for common questions about JustinCourse.',
  parameters: z.object({
    keywords: z.string().optional().describe('Optional keywords to filter FAQ documents')
  }),
  execute: async ({ keywords }) => {
    const result = await callMCPTool('list_faq_documents', keywords ? { keywords } : {});
    return result;
  },
});

// MCP Tool: get_faq_document - Get specific FAQ document content
export const getFaqDocument = tool({
  description: 'Get the full content of a specific FAQ document by ID.',
  parameters: z.object({
    id: z.number().describe('FAQ document ID')
  }),
  execute: async ({ id }) => {
    const result = await callMCPTool('get_faq_document', { id });
    return result;
  },
});
