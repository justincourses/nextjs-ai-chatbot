# AI Chatbot

一个基于Next.js的开源AI聊天机器人项目，支持多模态输入和AI生成内容。

## 主要特性

- **智能对话**: 支持多种AI模型，提供流畅的对话体验
- **多模态输入**: 支持文本、文件等多种输入方式
- **AI生成内容**: 支持生成代码、文档、图片等多种内容
- **响应式设计**: 适配桌面和移动设备
- **用户认证**: 完整的用户注册、登录和管理功能
- **数据持久化**: 聊天记录和用户数据持久化存储

## 模型支持

项目默认配置了火山引擎（Volcengine ARK）的Doubao模型，支持：
- 小模型（快速响应）
- 大模型（高质量输出）
- 推理模型（复杂任务处理）

## 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **UI组件**: shadcn/ui, Radix UI
- **样式**: Tailwind CSS
- **AI框架**: Vercel AI SDK
- **数据库**: PostgreSQL
- **认证**: NextAuth.js
- **状态管理**: SWR, Zustand

## 部署

可以通过以下方式部署你自己的版本：

### Vercel部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET,OPENAI_API_KEY&envDescription=Learn%20more%20about%20how%20to%20get%20the%20API%20Keys%20for%20the%20application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI%20Chatbot&demo-description=An%20Open-Source%20AI%20Chatbot%20Template%20Built%20With%20Next.js%20and%20the%20AI%20SDK%20by%20Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&stores=[{%22type%22:%22postgres%22},{%22type%22:%22blob%22}])

### 本地运行

需要使用[`.env.example`](.env.example)中定义的环境变量来运行本项目。

```bash
pnpm install
pnpm dev
```

项目将在 [localhost:3000](http://localhost:3000/) 上运行。
