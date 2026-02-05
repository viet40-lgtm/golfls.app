import Live2Client from './Live2Client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Live2Page() {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true';
    const sessionUserId = cookieStore.get('session_userId')?.value;
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    if (!isAuthenticated || !sessionUserId) {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <Live2Client
                currentUserId={sessionUserId}
                isAdmin={isAdmin}
            />
        </div>
    );
}
