'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Button } from './ui/button';

interface MCPResultData {
  toolName: string;
  args: Record<string, any>;
  result: any;
}

function extractText(result: any): string {
  if (typeof result === 'string') {
    return result;
  }
  
  if (result && typeof result === 'object') {
    // Handle error responses
    if (result.error) {
      return result.message || 'An error occurred';
    }
    
    // Handle MCP tool result format
    if (result.content && Array.isArray(result.content)) {
      return result.content
        .filter((item: any) => item.type === 'text' && item.text)
        .map((item: any) => item.text)
        .join('\n');
    }
    
    // Handle direct text responses
    if (result.text) {
      return result.text;
    }
    
    // Fallback to JSON stringify
    return JSON.stringify(result, null, 2);
  }
  
  return String(result);
}

function getToolIcon(toolName: string): string {
  switch (toolName) {
    case 'howToUse':
      return '💡';
    case 'searchKnowledgeBase':
      return '🔍';
    case 'searchWordPressPosts':
      return '📰';
    case 'listFaqDocuments':
      return '📋';
    case 'getFaqDocument':
      return '❓';
    default:
      return '🔧';
  }
}

function getToolDisplayName(toolName: string): string {
  switch (toolName) {
    case 'howToUse':
      return '使用指南';
    case 'searchKnowledgeBase':
      return '知识库搜索';
    case 'searchWordPressPosts':
      return 'WordPress 搜索';
    case 'listFaqDocuments':
      return 'FAQ 列表';
    case 'getFaqDocument':
      return 'FAQ 文档';
    default:
      return toolName;
  }
}

export function MCPResult({
  mcpResultData,
}: {
  mcpResultData?: MCPResultData;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!mcpResultData) {
    return (
      <div className="bg-background border rounded-xl p-4 w-fit flex flex-col gap-3 max-w-[600px] skeleton-bg">
        <div className="flex flex-row gap-3 items-start">
          <div className="text-muted-foreground mt-1">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">调用 MCP 工具中...</div>
            <div className="w-32 h-4 bg-muted rounded skeleton-div" />
          </div>
        </div>
      </div>
    );
  }

  const { toolName, args, result } = mcpResultData;
  const resultText = extractText(result);
  const hasError = result?.error;
  
  // Check if content is long enough to warrant expansion
  const isLongContent = resultText.length > 300;
  const displayText = isExpanded || !isLongContent 
    ? resultText 
    : `${resultText.substring(0, 300)}...`;

  return (
    <div className="bg-background border rounded-xl p-4 flex flex-col gap-4 max-w-[700px]">
      {/* Header */}
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-row gap-3 items-start">
          <div className="text-muted-foreground mt-1">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              {getToolIcon(toolName)} {getToolDisplayName(toolName)}
            </div>
            <div className="font-semibold">
              {args.keywords || args.userQuery || args.id || 'MCP 工具调用'}
            </div>
            {/* Show key parameters */}
            {Object.entries(args).length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {Object.entries(args)
                  .filter(([key]) => key !== 'keywords' && key !== 'userQuery' && key !== 'id')
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(', ')}
              </div>
            )}
          </div>
        </div>
        {isLongContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-1 text-muted-foreground"
          >
            {isExpanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3">
        <div className={`border rounded-lg p-3 ${hasError ? 'bg-destructive/10 border-destructive/20' : 'bg-muted/30'}`}>
          {hasError ? (
            <div className="text-sm text-destructive">
              ⚠️ {displayText}
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap">
              {displayText}
            </div>
          )}
          
          {isLongContent && !isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="mt-2 text-xs text-muted-foreground h-auto p-1"
            >
              显示完整内容
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center text-xs text-muted-foreground border-t pt-3">
        <div>MCP 工具调用</div>
        <div className="flex gap-3">
          <a href="https://justincourse.com" className="hover:text-foreground hover:underline" target="_blank" rel="noopener noreferrer">
            官网
          </a>
          <a href="https://app.justincourse.com" className="hover:text-foreground hover:underline" target="_blank" rel="noopener noreferrer">
            课程平台
          </a>
        </div>
      </div>
    </div>
  );
}