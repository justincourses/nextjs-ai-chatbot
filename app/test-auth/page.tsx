import { auth } from '@/app/(auth)/auth';

export default async function TestAuthPage() {
  const session = await auth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Session Info:</h2>
        <pre className="text-sm">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
      <div className="mt-4">
        <p>
          Status: {session?.user ? 'Logged In' : 'Not Logged In'}
        </p>
        {session?.user && (
          <p>User: {session.user.email}</p>
        )}
      </div>
    </div>
  );
}
