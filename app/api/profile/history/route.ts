import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth-server';
import { db } from '@/lib/db/db';
import { chat, message } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return new NextResponse('Invalid request', { status: 400 });
    }

    // Delete messages first (due to foreign key constraint)
    await db.delete(message).where(inArray(message.chatId, ids));

    // Then delete chats
    await db.delete(chat).where(inArray(chat.id, ids));

    return new NextResponse('Chats deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error deleting chats:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
