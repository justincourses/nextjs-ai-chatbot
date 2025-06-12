'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import useSWR from 'swr';
import { format } from 'date-fns';

import { fetcher } from '@/lib/utils';
import type { Chat } from '@/lib/db/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export function HistoryTab() {
  const { id } = useParams();
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: history, isLoading, mutate } = useSWR<Array<Chat>>('/api/history', fetcher, {
    fallbackData: [],
  });

  const handleDelete = async () => {
    if (selectedChats.length === 0) return;

    const deletePromise = fetch('/api/profile/history', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: selectedChats }),
    });

    toast.promise(deletePromise, {
      loading: 'Deleting chats...',
      success: () => {
        mutate((history) => {
          if (history) {
            return history.filter((h) => !selectedChats.includes(h.id));
          }
        });
        setSelectedChats([]);
        return 'Chats deleted successfully';
      },
      error: 'Failed to delete chats',
    });

    setShowDeleteDialog(false);
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
                onClick={() => setSelectedChat(chat)}
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

      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedChat?.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {/* Chat content will be added here */}
            <p className="text-muted-foreground">
              Chat content will be displayed here
            </p>
          </div>
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
