import { tool } from 'ai';
import { z } from 'zod';
import { mcpClient, type MCPToolResult } from '../mcp-client';

// Global MCP session management
let globalMCPSession: string | null = null;

async function ensureMCPConnection(): Promise<string> {
  try {
    if (globalMCPSession) {
      const status = mcpClient.getSessionStatus(globalMCPSession);
      if (status?.connected) {
        return globalMCPSession;
      }
    }
    
    globalMCPSession = await mcpClient.ensureConnection();
    return globalMCPSession;
  } catch (error) {
    console.error('Failed to establish MCP connection:', error);
    throw new Error('知识库服务暂时不可用，请稍后重试');
  }
}

async function callMCPTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
  const sessionId = await ensureMCPConnection();
  
  try {
    return await mcpClient.callTool(sessionId, toolName, args);
  } catch (error) {
    console.error(`MCP tool ${toolName} failed:`, error);
    
    // Try to reconnect once
    try {
      globalMCPSession = await mcpClient.connectSession();
      return await mcpClient.callTool(globalMCPSession, toolName, args);
    } catch (retryError) {
      console.error(`MCP tool ${toolName} retry failed:`, retryError);
      throw new Error(`知识库查询失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

function formatMCPResult(result: MCPToolResult): string {
  if (!result || !result.content || result.content.length === 0) {
    return '没有找到相关信息';
  }
  
  return result.content
    .filter(item => item.type === 'text' && item.text)
    .map(item => item.text)
    .join('\n\n');
}

export const courseInfo = tool({
  description: `搜索 JustinCourse 的课程信息、技术教程和常见问题。这个工具可以：
  - 搜索课程详情、课程安排和学习内容
  - 查找技术教程和实战项目
  - 回答报名、付费、学习要求等常见问题
  - 提供 Cloudflare Workers、Next.js、TypeScript 等技术资料
  支持中英文搜索，会自动选择最合适的搜索策略。`,
  parameters: z.object({
    query: z.string().describe('搜索关键词或问题，例如："web course 课程内容"、"如何报名"、"cloudflare workers 部署"、"next.js 教程"'),
    searchType: z.enum(['comprehensive', 'courses', 'tutorials', 'faq']).optional().default('comprehensive').describe(`
      搜索类型：
      - comprehensive: 全面搜索（默认），同时搜索课程、教程和FAQ
      - courses: 重点搜索课程信息和课程安排
      - tutorials: 重点搜索技术教程和实战内容
      - faq: 重点搜索常见问题和快速答案
    `),
    maxResults: z.number().optional().default(5).describe('最大结果数量 (1-10)，默认 5'),
  }),
  execute: async ({ query, searchType = 'comprehensive', maxResults = 5 }) => {
    try {
      const results: string[] = [];
      const maxRes = Math.min(Math.max(maxResults, 1), 10);

      switch (searchType) {
        case 'comprehensive':
          // 使用智能搜索，同时搜索所有来源
          try {
            const knowledgeResult = await callMCPTool('search_knowledge_base', {
              keywords: query,
              sources: 'all',
              max_results: maxRes
            });
            const formatted = formatMCPResult(knowledgeResult);
            if (formatted && formatted !== '没有找到相关信息') {
              results.push(`# 📚 知识库搜索结果\n\n${formatted}`);
            }
          } catch (error) {
            console.error('Comprehensive search error:', error);
          }
          break;

        case 'courses':
          // 课程相关搜索 - 结合 WordPress 和 FAQ
          try {
            // 首先搜索 WordPress 获取详细课程内容
            const wpResult = await callMCPTool('search_wordpress_posts', {
              keywords: query,
              per_page: maxRes
            });
            const wpFormatted = formatMCPResult(wpResult);
            if (wpFormatted && wpFormatted !== '没有找到相关信息') {
              results.push(`# 📰 课程详细内容\n\n${wpFormatted}`);
            }

            // 然后搜索 FAQ 获取报名信息
            const faqKeywords = query.includes('课程') || query.toLowerCase().includes('course') 
              ? '课程' : query;
            const faqListResult = await callMCPTool('list_faq_documents', {
              keywords: faqKeywords,
              limit: Math.min(maxRes, 5)
            });
            const faqFormatted = formatMCPResult(faqListResult);
            if (faqFormatted && faqFormatted !== '没有找到相关信息') {
              results.push(`# 📚 课程相关FAQ\n\n${faqFormatted}`);
            }
          } catch (error) {
            console.error('Course search error:', error);
            // Fallback to knowledge base search
            try {
              const fallbackResult = await callMCPTool('search_knowledge_base', {
                keywords: query,
                sources: 'all',
                max_results: maxRes
              });
              const formatted = formatMCPResult(fallbackResult);
              if (formatted && formatted !== '没有找到相关信息') {
                results.push(`# 📚 课程信息\n\n${formatted}`);
              }
            } catch (fallbackError) {
              console.error('Course search fallback error:', fallbackError);
            }
          }
          break;

        case 'tutorials':
          // 技术教程搜索 - 主要使用 WordPress
          try {
            const tutorialResult = await callMCPTool('search_wordpress_posts', {
              keywords: query,
              per_page: maxRes
            });
            const formatted = formatMCPResult(tutorialResult);
            if (formatted && formatted !== '没有找到相关信息') {
              results.push(`# 📖 技术教程\n\n${formatted}`);
            } else {
              // Fallback to knowledge base search
              const fallbackResult = await callMCPTool('search_knowledge_base', {
                keywords: query,
                sources: 'wordpress',
                max_results: maxRes
              });
              const fallbackFormatted = formatMCPResult(fallbackResult);
              if (fallbackFormatted && fallbackFormatted !== '没有找到相关信息') {
                results.push(`# 📖 相关教程\n\n${fallbackFormatted}`);
              }
            }
          } catch (error) {
            console.error('Tutorial search error:', error);
          }
          break;

        case 'faq':
          // FAQ 搜索
          try {
            const faqResult = await callMCPTool('list_faq_documents', {
              keywords: query,
              limit: maxRes
            });
            const formatted = formatMCPResult(faqResult);
            if (formatted && formatted !== '没有找到相关信息') {
              results.push(`# ❓ 常见问题\n\n${formatted}`);
            }
          } catch (error) {
            console.error('FAQ search error:', error);
          }
          break;
      }

      // 如果没有找到任何结果，尝试获取使用指南
      if (results.length === 0) {
        try {
          const helpResult = await callMCPTool('how_to_use', {});
          const helpFormatted = formatMCPResult(helpResult);
          results.push(`# ℹ️ 使用说明\n\n抱歉没有找到关于 "${query}" 的具体信息。\n\n${helpFormatted}`);
        } catch (error) {
          console.error('Help guide error:', error);
          results.push(`# ❌ 搜索结果\n\n抱歉，没有找到关于 "${query}" 的相关信息。\n\n请尝试：\n- 使用更具体的关键词\n- 访问官方网站：https://justincourse.com\n- 浏览课程平台：https://app.justincourse.com`);
        }
      }

      // 添加官方链接
      const finalResult = `${results.join('\n\n---\n\n')}\n\n---\n\n# 🔗 官方资源\n\n- 🏠 **官方网站**: https://justincourse.com\n- 📚 **课程平台**: https://app.justincourse.com\n- 💡 **更多课程信息和报名**: https://justincourse.com`;

      return finalResult;

    } catch (error) {
      console.error('CourseInfo tool error:', error);
      
      return `# ❌ 搜索错误\n\n很抱歉，搜索过程中出现了问题：${error instanceof Error ? error.message : '未知错误'}\n\n请稍后重试，或直接访问：\n- 🏠 官方网站：https://justincourse.com\n- 📚 课程平台：https://app.justincourse.com`;
    }
  },
});