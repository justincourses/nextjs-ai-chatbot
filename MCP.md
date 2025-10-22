# MCP (Model Context Protocol) 集成指南

## 概述

本文档介绍如何在 AI 聊天机器人中集成 MCP (Model Context Protocol) 服务器，通过 Server-Sent Events (SSE) 连接获取外部工具和知识库功能。

## MCP 服务器地址与握手

**SSE 端点**: `https://hono-mcp-demo.justincourse.site/sse`

- 首次连接时仅建立到 `/sse` 的 **只读** EventSource。
- 服务器会通过 `event: endpoint` 发送用于读写的消息端点，例如：  
  `data: /sse/message?sessionId=<server-session-id>`  
  此端点用于所有后续的 `tools/*` 调用。
- 服务器期望 `POST` 请求使用标准 MCP JSON-RPC 负载，无需额外自定义头。
- 如果直接对 `/mcp` 发起请求会收到 `406 Not Acceptable`。

## 服务器功能

### 可用工具

1. **知识库搜索** (`search_knowledge_base`)
   - 搜索 WordPress 博客文章和 FAQ 文档
   - 支持中英文关键词搜索
   - 返回格式化的搜索结果

2. **WordPress 内容搜索** (`search_wordpress_posts`)
   - 搜索详细的课程内容和技术教程
   - 包含文章元数据：分类、标签、发布日期
   - 提供完整的教程链接

3. **FAQ 文档管理**
   - `list_faq_documents`: 浏览常见问题列表
   - `get_faq_document`: 获取完整 FAQ 内容

4. **计算工具**
   - `add`: 简单加法运算
   - `calculate`: 支持四则运算

5. **使用指南** (`how_to_use`)
   - 获取详细的使用说明和最佳实践

### 数据源

- **WordPress API**: 实时课程内容和技术教程
- **FAQ 数据库**: 常见问题的快速答案
- **R2 存储**: FAQ 文档的完整内容

## 技术架构

### 后端实现

```typescript
// MCP 服务器基于 Hono 框架和 Cloudflare Workers
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "JustinCourse Knowledge Base Assistant",
    version: "2.1.0",
  });
  
  // 工具注册和处理逻辑
  async init() {
    this.server.tool("search_knowledge_base", /* ... */);
    this.server.tool("search_wordpress_posts", /* ... */);
    // 其他工具...
  }
}
```

### 数据库架构

```sql
-- FAQ 索引表
CREATE TABLE faq_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fileName TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT, -- JSON array
  r2Key TEXT NOT NULL,
  lastIndexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 对话记录表
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId TEXT NOT NULL,
  userQuestion TEXT NOT NULL,
  aiResponse TEXT NOT NULL,
  logFileKey TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## SSE 连接实现

### 客户端握手与调用示例

```typescript
// Step 1: 建立只读 SSE 连接
const baseUrl = 'https://hono-mcp-demo.justincourse.site';
const eventSource = new EventSource(`${baseUrl}/sse`);

let messageEndpoint: string | null = null;

eventSource.addEventListener('endpoint', (event) => {
  // 服务器返回相对路径：/sse/message?sessionId=...
  const rawEndpoint = String(event.data || '').trim();
  messageEndpoint = rawEndpoint.startsWith('http')
    ? rawEndpoint
    : `${baseUrl}${rawEndpoint.startsWith('/') ? '' : '/'}${rawEndpoint}`;
});

eventSource.onmessage = (event) => {
  // 常规 MCP 消息（JSON-RPC 响应或通知）
  const message = JSON.parse(event.data);
  handleMCPMessage(message);
};

// Step 2: 使用服务器返回的 messageEndpoint 发送工具调用
async function callMCPTool(toolName: string, parameters: any) {
  if (!messageEndpoint) {
    throw new Error('MCP message endpoint not ready');
  }

  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: parameters,
    },
  };

  const response = await fetch(messageEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

### 工具调用示例

```typescript
// 搜索知识库
const searchResults = await callMCPTool('search_knowledge_base', {
  keywords: 'cloudflare workers deployment',
  sources: 'all',
  max_results: 5
});

// 搜索 WordPress 文章
const wpResults = await callMCPTool('search_wordpress_posts', {
  keywords: 'web course typescript',
  per_page: 10
});

// 获取 FAQ 文档
const faqContent = await callMCPTool('get_faq_document', {
  id: 5
});
```

## 集成到聊天机器人

### 工具路由配置

```typescript
// 在聊天处理逻辑中集成 MCP 工具
import { tool } from 'ai';

const mcpTools = {
  searchKnowledge: tool({
    description: '搜索 JustinCourse 知识库',
    parameters: z.object({
      keywords: z.string().describe('搜索关键词'),
      sources: z.enum(['all', 'wordpress', 'faq']).optional(),
    }),
    execute: async ({ keywords, sources = 'all' }) => {
      return await callMCPTool('search_knowledge_base', {
        keywords,
        sources,
        max_results: 5
      });
    },
  }),
  
  searchCourses: tool({
    description: '搜索详细的课程内容和教程',
    parameters: z.object({
      keywords: z.string().describe('课程相关关键词'),
    }),
    execute: async ({ keywords }) => {
      return await callMCPTool('search_wordpress_posts', {
        keywords,
        per_page: 8
      });
    },
  }),
};
```

### 消息处理流程

```typescript
// 在聊天 API 中处理 MCP 工具调用
export async function POST(request: Request) {
  const { messages } = await request.json();
  
  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    tools: mcpTools,
    onToolCall: async ({ toolCall }) => {
      console.log('调用 MCP 工具:', toolCall.toolName);
    },
  });
  
  return result.toDataStreamResponse();
}
```

## 最佳实践

### 1. 错误处理

```typescript
async function safeMCPCall(toolName: string, parameters: any) {
  try {
  const result = await callMCPTool(toolName, parameters);
  
  if (result.error) {
    console.error('MCP 工具错误:', result.error);
    return { error: result.error.message };
  }
    
    return result.result;
  } catch (error) {
    console.error('MCP 调用失败:', error);
    return { error: '服务暂时不可用，请稍后重试' };
  }
}
```

### 2. 缓存策略

```typescript
// 实现简单的响应缓存
const cache = new Map();

async function cachedMCPCall(toolName: string, parameters: any) {
  const cacheKey = `${toolName}-${JSON.stringify(parameters)}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await callMCPTool(toolName, parameters);
  cache.set(cacheKey, result);
  
  // 5分钟后清除缓存
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  
  return result;
}
```

### 3. 智能工具选择

```typescript
function selectOptimalTool(userQuery: string) {
  // 课程相关查询
  if (/课程|course|学习|教程/.test(userQuery)) {
    return ['search_knowledge_base', 'search_wordpress_posts'];
  }
  
  // 技术问题
  if (/部署|deployment|配置|setup/.test(userQuery)) {
    return ['search_wordpress_posts'];
  }
  
  // 常见问题
  if (/如何|怎么|报名|付费/.test(userQuery)) {
    return ['list_faq_documents', 'search_knowledge_base'];
  }
  
  return ['search_knowledge_base'];
}
```

## 监控和日志

### API 端点

- **健康检查**: `GET /`
- **API 列表**: `GET /api`
- **搜索接口**: `GET /api/search?keywords=...`
- **WordPress 搜索**: `GET /api/wordpress/search?keywords=...`
- **FAQ 列表**: `GET /api/faq/list?keywords=...`
- **FAQ 详情**: `GET /api/faq/:id`

### 测试端点

- **R2 存储测试**: `GET /test/r2`
- **D1 数据库测试**: `GET /test/d1`
- **AI 服务测试**: `GET /test/ai`

## 注意事项

1. **连接稳定性**: SSE 连接可能会断开，需要实现重连机制
2. **速率限制**: 合理控制工具调用频率，避免超出服务限制
3. **数据新鲜度**: WordPress 数据是实时的，FAQ 数据定期更新
4. **安全性**: 所有 API 调用都通过 HTTPS 进行，确保数据传输安全

## 相关链接

- **官方网站**: https://justincourse.com
- **课程平台**: https://app.justincourse.com
- **MCP 规范**: https://modelcontextprotocol.io/
- **Cloudflare Workers**: https://workers.cloudflare.com/
