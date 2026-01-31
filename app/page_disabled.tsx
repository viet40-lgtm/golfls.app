import { cookies } from 'next/headers';
import LoginForm from './login/LoginForm';

export default async function HomePage() {
    const cookieStore = await cookies();
    const lastEmail = cookieStore.get('last_email')?.value;

    // We intently do NOT check for existing session here to satisfy "do not auto login user".
    // The user will always see the login screen at the root.

    return <LoginForm initialEmail={lastEmail} />;
}
