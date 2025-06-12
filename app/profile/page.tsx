import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth-server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!user) {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <div className="bg-card rounded-lg shadow p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Email</h2>
              <p className="mt-1">{user.email}</p>
            </div>
            {user.name && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Name</h2>
                <p className="mt-1">{user.name}</p>
              </div>
            )}
            {user.image && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Profile Image</h2>
                <img
                  src={user.image}
                  alt="Profile"
                  className="mt-2 size-24 rounded-full"
                />
              </div>
            )}
            {user.emailVerified && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Email Verified</h2>
                <p className="mt-1">{new Date(user.emailVerified).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
