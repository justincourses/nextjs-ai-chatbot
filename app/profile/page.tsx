import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth-server';
import { getUser } from '@/lib/db/queries';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  const users = await getUser(session.user.email);
  const user = users[0];

  if (!user) {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </div>
        <div className="bg-card rounded-lg shadow p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
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
