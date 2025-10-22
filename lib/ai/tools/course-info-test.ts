import { tool } from 'ai';
import { z } from 'zod';

export const courseInfoTest = tool({
  description: '测试工具 - 返回 JustinCourse 基本信息',
  parameters: z.object({
    query: z.string().describe('查询内容')
  }),
  execute: async ({ query }) => {
    // 简单的静态响应，用于测试工具调用是否正常
    return `# JustinCourse 课程信息

您查询的内容：${query}

## 📚 课程概览
JustinCourse 提供以下技术课程：
- Web 全栈开发课程
- Cloudflare Workers 实战
- Next.js 深度学习
- TypeScript 进阶

## 📝 报名信息
- 官方网站：https://justincourse.com
- 课程平台：https://app.justincourse.com

## 💡 学习特色
- 实战项目导向
- 一对一指导
- 完整的学习路径

如需了解更多详细信息，请访问官方网站。`;
  },
});