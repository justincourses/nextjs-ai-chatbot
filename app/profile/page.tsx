import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth-server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Image from 'next/image';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
    },
  });

  if (!user) {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <div className="bg-card rounded-lg shadow p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'Profile'}
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              ) : (
                <div className="size-24 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">{user.name || 'No name set'}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p className="mt-1">{user.email}</p>
              </div>
              {user.name && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p className="mt-1">{user.name}</p>
                </div>
              )}
              {user.emailVerified && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email Verified</h3>
                  <p className="mt-1">{new Date(user.emailVerified).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
