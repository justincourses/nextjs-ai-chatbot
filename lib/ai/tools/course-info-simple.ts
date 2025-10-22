import { tool } from 'ai';
import { z } from 'zod';

// Simple HTTP-based approach instead of MCP for better compatibility
async function searchJustinCourse(query: string, searchType: string = 'all'): Promise<string> {
  try {
    // Use the REST API endpoints directly
    const baseUrl = 'https://hono-mcp-demo.justincourse.site';
    
    if (searchType === 'faq' || searchType === 'all') {
      // Search FAQ documents
      const faqResponse = await fetch(`${baseUrl}/api/faq/list?keywords=${encodeURIComponent(query)}&limit=5`);
      if (faqResponse.ok) {
        const faqData = await faqResponse.json();
        if (faqData.status === 'success' && faqData.documents?.length > 0) {
          const faqResults = faqData.documents.map((doc: any, index: number) => {
            const tags = Array.isArray(doc.tags) ? doc.tags.join(', ') : 'None';
            return `${index + 1}. 📚 **${doc.title}** (ID: ${doc.id})
   🏷️  Tags: ${tags}
   📝 ${doc.description || 'No description'}
   💡 获取详细内容请访问: ${baseUrl}/api/faq/${doc.id}`;
          }).join('\n\n');
          
          return `# 📚 FAQ 搜索结果 - "${query}"\n\n${faqResults}\n\n---\n\n# 🔗 官方资源\n- 🏠 **官方网站**: https://justincourse.com\n- 📚 **课程平台**: https://app.justincourse.com`;
        }
      }
    }
    
    if (searchType === 'wordpress' || searchType === 'all') {
      // Search WordPress posts
      const wpResponse = await fetch(`${baseUrl}/api/wordpress/search?keywords=${encodeURIComponent(query)}&per_page=5`);
      if (wpResponse.ok) {
        const wpData = await wpResponse.json();
        if (wpData.status === 'success' && wpData.posts?.length > 0) {
          const wpResults = wpData.posts.map((post: any, index: number) => {
            const categories = Array.isArray(post.categories) ? post.categories.join(', ') : 'Uncategorized';
            const tags = Array.isArray(post.tags) ? post.tags.join(', ') : 'No tags';
            
            return `${index + 1}. 📄 **${post.title}**
   🔗 Link: ${post.link}
   📅 Published: ${new Date(post.date).toLocaleDateString()}
   📁 Categories: ${categories}
   🏷️  Tags: ${tags}
   📝 ${post.excerpt ? post.excerpt.substring(0, 200) + '...' : 'No excerpt'}`;
          }).join('\n\n');
          
          return `# 📰 WordPress 搜索结果 - "${query}"\n\n${wpResults}\n\n---\n\n# 🔗 官方资源\n- 🏠 **官方网站**: https://justincourse.com\n- 📚 **课程平台**: https://app.justincourse.com`;
        }
      }
    }
    
    // If no results found, return helpful message
    return `# ❓ 搜索结果 - "${query}"\n\n抱歉，没有找到关于 "${query}" 的相关信息。\n\n请尝试：\n- 使用更具体的关键词\n- 访问官方网站：https://justincourse.com\n- 浏览课程平台：https://app.justincourse.com\n\n**常见问题类型：**\n- 课程报名和付费方式\n- 技术教程和学习资料\n- Cloudflare Workers、Next.js、TypeScript 等技术内容`;
    
  } catch (error) {
    console.error('Search error:', error);
    return `# ❌ 搜索错误\n\n很抱歉，搜索过程中出现了问题。请稍后重试，或直接访问：\n- 🏠 官方网站：https://justincourse.com\n- 📚 课程平台：https://app.justincourse.com`;
  }
}

export const courseInfoSimple = tool({
  description: `搜索 JustinCourse 的课程信息和常见问题。可以搜索课程内容、报名信息、技术教程和学习资料。`,
  parameters: z.object({
    query: z.string().describe('搜索关键词，例如："课程报名"、"cloudflare workers"、"next.js 教程"'),
    searchType: z.enum(['all', 'wordpress', 'faq']).optional().default('all').describe('搜索类型：all(全部), wordpress(技术教程), faq(常见问题)')
  }),
  execute: async ({ query, searchType = 'all' }) => {
    const result = await searchJustinCourse(query, searchType);
    return result;
  },
});