'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'


export async function serverPing() {
    console.log("SERVER PING RECEIVED");
    return { success: true, message: "pong", time: new Date().toISOString() };
}

export async function login(prevState: any, formData: FormData) {
    try {
        console.log("Login Action Started");

        if (!process.env.DATABASE_URL) {
            console.error("DATABASE_URL is missing");
            return { error: 'System Config Error: DATABASE_URL is missing in Vercel environment variables.' };
        }

        const identifier = (formData.get('identifier') || formData.get('email')) as string
        const password = formData.get('password') as string

        if (!identifier || !password) {
            return { error: 'Email/Player ID and password are required', email: identifier }
        }

        console.log("Attempting to find user by identifier:", identifier);

        // Test database connection explicitly first to fail fast with clear error
        try {
            await prisma.$connect();
        } catch (dbError) {
            console.error("Failed to connect to database:", dbError);
            return { error: 'Database Connection Error: ' + (dbError instanceof Error ? dbError.message : String(dbError)) };
        }

        const player = await prisma.player.findFirst({
            where: {
                OR: [
                    {
                        email: {
                            equals: identifier,
                            mode: 'insensitive'
                        }
                    },
                    {
                        playerId: {
                            equals: identifier,
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        })

        if (!player || !player.password) {
            console.log("User not found or password missing.");
            return { error: 'Invalid credentials', email: identifier }
        }

        console.log("User found, verifying password...");
        const isValid = await bcrypt.compare(password, player.password)

        if (!isValid) {
            console.log("Invalid password.");
            return { error: 'Invalid credentials', email: identifier }
        }

        console.log("Password valid, setting session...");

        // Set session
        const cookieStore = await cookies()
        cookieStore.set('session_userId', player.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/'
        })
        cookieStore.set('auth_status', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

        return { success: true }
    } catch (error) {
        console.error('CRITICAL LOGIN ERROR:', error)
        return { error: 'Unexpected Login Error: ' + (error instanceof Error ? error.message : String(error)) }
    }
}

import { Resend } from 'resend';

export async function forgotPassword(prevState: any, formData: FormData) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Email is required' }
    }

    try {
        const player = await prisma.player.findFirst({
            where: { email: email.trim() }
        })

        if (player) {
            // Generate token
            const token = crypto.randomUUID();
            const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

            await prisma.player.update({
                where: { id: player.id },
                data: {
                    resetToken: token,
                    resetTokenExpiry: expires
                }
            });

            // In production, use actual domain. Locally, use localhost.
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const resetLink = `${baseUrl}/reset-password?token=${token}`;

            console.log('-------------------------------------------');
            console.log('Generated reset link:', resetLink);
            console.log('-------------------------------------------');

            await resend.emails.send({
                from: 'onboarding@resend.dev', // Can only send to own email on free tier without domain verification
                to: email,
                subject: 'Reset Your GolfLS.app Password',
                html: `
                    <p>Hello ${player.name},</p>
                    <p>You requested a password reset. Click the link below to set a new password:</p>
                    <p><a href="${resetLink}">Reset Password</a></p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, you can ignore this email.</p>
                `
            });
        }

        // Always return success to prevent email enumeration
        return { success: true, message: 'If an account exists with this email, a reset link has been sent.' }
    } catch (error) {
        console.error('Forgot password error:', error)
        return { error: 'Forgot Password Error: ' + (error instanceof Error ? error.message : String(error)) }
    }
}

export async function resetPassword(token: string, formData: FormData) {
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!password || password !== confirmPassword) {
        return { error: 'Passwords do not match or are empty' };
    }

    try {
        const player = await prisma.player.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date()
                }
            }
        });

        if (!player) {
            return { error: 'Invalid or expired reset token' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.player.update({
            where: { id: player.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { error: 'Reset Password Error: ' + (error instanceof Error ? error.message : String(error)) };
    }
}

export async function signup(prevState: any, formData: FormData) {
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string
    const email = formData.get('email') as string
    const birthday = formData.get('birthday') as string
    const dateStarted = formData.get('dateStarted') as string
    const preferredTeeBox = formData.get('preferredTeeBox') as string
    const handicapIndexStr = formData.get('handicapIndex') as string

    if (!firstName || !lastName || !email || !password) {
        return { error: 'Name, email, and password are required' }
    }

    if (password.length < 4) {
        return { error: 'Password must be at least 4 characters long' }
    }

    const name = `${firstName} ${lastName}`.trim()

    // Check if email exists
    const existing = await prisma.player.findFirst({
        where: {
            email: {
                equals: email,
                mode: 'insensitive'
            }
        }
    })

    if (existing) {
        return { error: 'Player with this email already exists' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const newPlayer = await prisma.player.create({
            data: {
                // id will be auto-generated UUID
                playerId: (firstName && phone) ? (firstName.charAt(0) + phone.replace(/\D/g, '').slice(-4)).toUpperCase() : null,
                name: name,
                email: email,
                phone: phone || null, // Optional
                password: hashedPassword,
                birthday: birthday || null,
                dateStarted: dateStarted || null,
                preferredTeeBox: preferredTeeBox || null,
                handicapIndex: handicapIndexStr ? parseFloat(handicapIndexStr) : 0
            }
        })

        // Auto login
        const cookieStore = await cookies()
        cookieStore.set('session_userId', newPlayer.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/'
        })
        cookieStore.set('auth_status', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Signup Error: ' + (e instanceof Error ? e.message : String(e)) }
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session_userId')
    cookieStore.delete('auth_status')
    cookieStore.delete('admin_session')
    redirect('/')
}

export async function adminLogout() {
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    revalidatePath('/settings')
}

export async function verifyAdminPassword(password: string) {
    if (password === 'Viet65+$') {
        const cookieStore = await cookies();
        cookieStore.set('admin_session', 'true', {
            httpOnly: false, // Accessible by client to check status
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/'
        });
        revalidatePath('/settings');
        return { success: true };
    }
    return { success: false, error: 'Incorrect password' };
}
