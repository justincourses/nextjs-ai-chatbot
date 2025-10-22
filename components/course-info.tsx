'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Button } from './ui/button';

interface CourseInfoData {
  query: string;
  searchType: string;
  result: string;
}

function extractSections(content: string) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection: { title: string; content: string; items: Array<{ title: string; content: string }> } | null = null;
  let currentItem: { title: string; content: string } | null = null;

  for (const line of lines) {
    // Main section headers (# )
    if (line.startsWith('# ')) {
      if (currentSection && currentItem) {
        currentSection.items.push(currentItem);
        currentItem = null;
      }
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace('# ', '').trim(),
        content: '',
        items: []
      };
    }
    // Item headers (数字. )
    else if (/^\d+\.\s/.test(line)) {
      if (currentSection && currentItem) {
        currentSection.items.push(currentItem);
      }
      currentItem = {
        title: line.trim(),
        content: ''
      };
    }
    // Regular content lines
    else if (line.trim()) {
      if (currentItem) {
        currentItem.content += (currentItem.content ? '\n' : '') + line.trim();
      } else if (currentSection) {
        currentSection.content += (currentSection.content ? '\n' : '') + line.trim();
      }
    }
  }

  // Add the last item and section
  if (currentSection && currentItem) {
    currentSection.items.push(currentItem);
  }
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

export function CourseInfo({
  courseInfoData,
}: {
  courseInfoData?: CourseInfoData;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!courseInfoData) {
    return (
      <div className="bg-background border rounded-xl p-4 w-fit flex flex-col gap-3 max-w-[600px] skeleton-bg">
        <div className="flex flex-row gap-3 items-start">
          <div className="text-muted-foreground mt-1">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">搜索课程信息中...</div>
            <div className="w-32 h-4 bg-muted rounded skeleton-div" />
          </div>
        </div>
      </div>
    );
  }

  const sections = extractSections(courseInfoData.result);
  const hasContent = sections.length > 0;
  const firstSection = sections[0];
  const otherSections = sections.slice(1);

  const getSearchTypeIcon = (searchType: string) => {
    switch (searchType) {
      case 'faq':
        return '❓';
      case 'wordpress':
        return '📰';
      default:
        return '🔍';
    }
  };

  const getSearchTypeLabel = (searchType: string) => {
    switch (searchType) {
      case 'faq':
        return 'FAQ 搜索';
      case 'wordpress':
        return '技术教程搜索';
      default:
        return '综合搜索';
    }
  };

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
              {getSearchTypeIcon(courseInfoData.searchType)} {getSearchTypeLabel(courseInfoData.searchType)}
            </div>
            <div className="font-semibold">
              {courseInfoData.query}
            </div>
          </div>
        </div>
        {hasContent && otherSections.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-1 text-muted-foreground"
          >
            {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Content */}
      {hasContent ? (
        <div className="flex flex-col gap-3">
          {/* First section summary */}
          {firstSection && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="font-semibold text-base mb-2">{firstSection.title}</div>
              {firstSection.content && (
                <div className="text-sm text-muted-foreground mb-3">{firstSection.content}</div>
              )}
              {firstSection.items.length > 0 && (
                <div className="space-y-2">
                  {firstSection.items.slice(0, isExpanded ? undefined : 2).map((item, index) => {
                    const lines = item.content.split('\n');
                    const mainInfo = lines[0];
                    const details = lines.slice(1).join(' ');
                    
                    return (
                      <div key={`${item.title}-${index}`} className="bg-background border rounded p-3 text-sm">
                        <div className="font-medium">{item.title}</div>
                        {mainInfo && <div className="text-muted-foreground mt-1">{mainInfo}</div>}
                        {isExpanded && details && (
                          <div className="text-xs text-muted-foreground mt-1">{details}</div>
                        )}
                      </div>
                    );
                  })}
                  {!isExpanded && firstSection.items.length > 2 && (
                    <div className="text-center text-sm text-muted-foreground">
                      +{firstSection.items.length - 2} 更多结果...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Expanded content */}
          {isExpanded && otherSections.map((section, sectionIndex) => (
            <div key={`${section.title}-${sectionIndex}`} className="border rounded-lg p-3 bg-muted/30">
              <div className="font-semibold mb-2">{section.title}</div>
              {section.content && (
                <div className="text-sm text-muted-foreground mb-2">{section.content}</div>
              )}
              {section.items.length > 0 && (
                <div className="space-y-1">
                  {section.items.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="bg-background border rounded p-2 text-sm">
                      <div className="font-medium">{item.title}</div>
                      {item.content && <div className="text-xs text-muted-foreground mt-1">{item.content}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-3 text-center bg-muted/30">
          <div className="text-sm text-muted-foreground">
            抱歉，没有找到相关信息。您可以尝试其他关键词或访问 
            <a href="https://justincourse.com" className="underline ml-1 text-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
              官方网站
            </a>
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="flex flex-row justify-between items-center text-xs text-muted-foreground border-t pt-3">
        <div>JustinCourse 知识库</div>
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