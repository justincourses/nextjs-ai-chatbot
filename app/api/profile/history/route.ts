import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth-server';
import { db } from '@/lib/db/db';
import { chat, message } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: ids must be a non-empty array',
      }, { status: 400 });
    }

    // Delete messages first (due to foreign key constraint)
    await db.delete(message).where(inArray(message.chatId, ids));

    // Then delete chats
    const deletedChats = await db.delete(chat).where(inArray(chat.id, ids)).returning();

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deletedChats.length,
        deletedIds: ids,
      },
    });
  } catch (error) {
    console.error('Error deleting chats:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 });
  }
}
