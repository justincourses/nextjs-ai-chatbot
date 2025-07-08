'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { format } from 'date-fns';

import { fetcher } from '@/lib/utils';
import type { Chat } from '@/lib/db/schema';
import type { Message } from 'ai';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/markdown';
import { LoaderIcon } from '@/components/icons';

export function HistoryTab() {
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [chatDetails, setChatDetails] = useState<{
    chat: Chat;
    messages: Message[];
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const { data: history, isLoading, mutate } = useSWR<Array<Chat>>('/api/history', fetcher, {
    fallbackData: [],
  });

  const handleChatClick = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsLoadingDetails(true);
    setChatDetails(null);

    try {
      const response = await fetch(`/api/chat?id=${chat.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat details');
      }
      const data = await response.json();
      setChatDetails(data);
    } catch (error) {
      toast.error('Failed to load chat details');
      console.error('Error fetching chat details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDelete = async () => {
    if (selectedChats.length === 0) return;

    try {
      const response = await fetch('/api/profile/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedChats }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete chats');
      }

      toast.success(`Successfully deleted ${data.data.deletedCount} chats`);
      mutate((history) => {
        if (history) {
          return history.filter((h) => !selectedChats.includes(h.id));
        }
      });
      setSelectedChats([]);
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete chats');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (!history?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No chat history found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedChats.length} selected
        </div>
        {selectedChats.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Selected
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {history.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={selectedChats.includes(chat.id)}
                onCheckedChange={(checked) => {
                  setSelectedChats((prev) =>
                    checked
                      ? [...prev, chat.id]
                      : prev.filter((id) => id !== chat.id)
                  );
                }}
              />
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleChatClick(chat)}
              >
                <div className="font-medium">{chat.title}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(chat.createdAt), 'PPp')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={!!selectedChat} onOpenChange={() => {
        setSelectedChat(null);
        setChatDetails(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedChat?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-4">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <LoaderIcon size={16} />
                <span className="ml-2">Loading chat details...</span>
              </div>
            ) : chatDetails ? (
              <div className="space-y-4">
                {chatDetails.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-xs font-medium mb-2 opacity-70">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </div>
                      <div className="text-sm">
                        <Markdown>{message.content as string}</Markdown>
                      </div>
                      <div className="text-xs opacity-50 mt-2">
                        {message.createdAt ? format(new Date(message.createdAt), 'PPp') : 'Unknown time'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Failed to load chat details
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Chats</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete {selectedChats.length} selected chats?
            This action cannot be undone.
          </div>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
