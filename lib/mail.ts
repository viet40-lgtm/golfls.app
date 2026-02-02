import { Resend } from 'resend';

export async function sendResetPasswordEmail(email: string, token: string) {
    // Lazy initialization - only create Resend client when actually sending email
    // This prevents crashes when RESEND_API_KEY is missing but not needed (e.g., during login)
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return { error: 'Email service not configured. Please contact support.' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Ensure we don't send people to production if we are testing locally
    if (process.env.NODE_ENV === 'development') {
        baseUrl = 'http://localhost:3000';
    }

    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
        const { data, error } = await resend.emails.send({
            from: 'GolfLS <updates@resend.dev>', // Use a default resend address if domain isn't verified yet
            to: email,
            subject: 'Reset your password - GolfLS.app',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                    <h2 style="color: #2b7a3a; text-align: center;">GolfLS.app</h2>
                    <p>Hello,</p>
                    <p>You requested a password reset for your GolfLS account. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #1b4332; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888; text-align: center;">
                        © 2026 GolfLS.app
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return { error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { error: 'Failed to send reset email' };
    }
}
