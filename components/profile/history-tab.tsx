'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { format } from 'date-fns';

import { fetcher } from '@/lib/utils';
import type { Chat, Vote } from '@/lib/db/schema';
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
import { LoaderIcon } from '@/components/icons';
import Link from 'next/link';
import { ExternalLinkIcon } from 'lucide-react';
import { PreviewMessage } from '@/components/message';

export function HistoryTab() {
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [chatDetails, setChatDetails] = useState<{
    chat: Chat;
    messages: Message[];
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);

  const { data: history, isLoading, mutate } = useSWR<Array<Chat>>('/api/history', fetcher, {
    fallbackData: [],
  });

  const handleChatClick = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsLoadingDetails(true);
    setChatDetails(null);
    setVotes([]);

    try {
      const [chatResponse, votesResponse] = await Promise.all([
        fetch(`/api/chat?id=${chat.id}`),
        fetch(`/api/vote?chatId=${chat.id}`)
      ]);

      if (!chatResponse.ok) {
        throw new Error('Failed to fetch chat details');
      }

      const chatData = await chatResponse.json();
      setChatDetails(chatData);

      if (votesResponse.ok) {
        const votesData = await votesResponse.json();
        setVotes(votesData);
      }
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
        <DialogContent className="max-w-4xl max-h-[80vh] backdrop-blur-md bg-background/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedChat?.title}</span>
              {selectedChat && (
                <Link
                  href={`/chat/${selectedChat.id}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLinkIcon size={14} />
                  <span>Open full chat</span>
                </Link>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-4 pr-4">
            <div className="pr-2">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderIcon size={16} />
                  <span className="ml-2">Loading chat details...</span>
                </div>
              ) : chatDetails ? (
                <div className="space-y-6">
                  {chatDetails.messages.map((message) => (
                    <PreviewMessage
                      key={message.id}
                      chatId={chatDetails.chat.id}
                      message={message}
                      isLoading={false}
                      vote={votes.find((vote) => vote.messageId === message.id)}
                      setMessages={() => {}} // Read-only mode
                      reload={async () => null} // Read-only mode
                      isReadonly={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Failed to load chat details
                </div>
              )}
            </div>
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
