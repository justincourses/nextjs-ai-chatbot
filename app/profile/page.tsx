import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth-server';
import { getUserById } from '@/lib/db/queries';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HistoryTab } from '@/components/profile/history-tab';
import { ProfileEditor } from '@/components/profile/profile-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 mx-auto">
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

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="profile" className="flex-1 sm:flex-none">Profile</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 sm:flex-none">History</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="bg-card rounded-lg shadow p-4 sm:p-6">
                <div className="space-y-6">
                  <ProfileEditor
                    initialName={user.name}
                    initialImage={user.image}
                  />

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">User ID</h3>
                      <p className="mt-1 font-mono text-sm break-all">{user.id}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                      <p className="mt-1">{user.name || 'Not set'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                      <p className="mt-1 break-all">{user.email}</p>
                    </div>
                    {user.emailVerified && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Email Verified</h3>
                        <p className="mt-1">{new Date(user.emailVerified).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="bg-card rounded-lg shadow p-4 sm:p-6">
                <HistoryTab />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
