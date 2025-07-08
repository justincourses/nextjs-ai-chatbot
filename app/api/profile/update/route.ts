import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth-server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, image } = await request.json();

    // Validate name
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length > 255) {
        return NextResponse.json(
          { error: 'Name is too long' },
          { status: 400 }
        );
      }
    }

    // Validate image URL if provided
    if (image !== undefined) {
      try {
        new URL(image);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid image URL' },
          { status: 400 }
        );
      }
    }

    // Update user by ID (more secure than email)
    const [updatedUser] = await db
      .update(users)
      .set({
        name: name !== undefined ? name.trim() : undefined,
        image: image !== undefined ? image : undefined,
      })
      .where(eq(users.id, session.user.id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.name,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
