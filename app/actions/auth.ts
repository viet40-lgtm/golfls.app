'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { sendResetPasswordEmail } from '@/lib/mail'
import crypto from 'crypto'

const isDev = process.env.NODE_ENV === 'development'

export async function login(prevState: any, formData: FormData) {
    const input = formData.get('email') as string
    const password = formData.get('password') as string

    if (!input || !password) return { error: 'Please enter both Email/ID and Password' }
    if (password.length < 4) return { error: 'Password must be at least 4 characters' }

    try {
        const player = await prisma.player.findFirst({
            where: {
                OR: [
                    { email: input.toLowerCase().trim() },
                    { playerId: input.toUpperCase().trim() }
                ]
            }
        })

        if (!player || !player.password) {
            return { error: 'Invalid Email, ID, or Password' }
        }

        const isMatch = await bcrypt.compare(password, player.password);
        if (!isMatch) {
            return { error: 'Invalid Email, ID, or Password' }
        }

        const cookieStore = await cookies()
        cookieStore.set('session_userId', player.id, { httpOnly: true, path: '/' })
        cookieStore.set('auth_status', 'true', { path: '/' })
        // Store the input used (if it looks like an email) or the player's primary email
        if (player.email) {
            cookieStore.set('last_email', player.email, { path: '/', maxAge: 60 * 60 * 24 * 30 })
        }

        if (player.name) {
            cookieStore.set('player_name', player.name, { path: '/' })
        }

        return { success: true }
    } catch (e) {
        console.error('Login CRITICAL error:', e)
        return { error: 'A system error occurred during sign in. Please try again.' }
    }
}

export async function signup(prevState: any, formData: FormData) {
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string

    if (!email || !password || !firstName || !lastName) {
        return { error: 'Missing required fields' }
    }

    if (password.length < 4) {
        return { error: 'Password must be at least 4 characters' }
    }

    try {
        const existing = await prisma.player.findUnique({
            where: { email: email.toLowerCase().trim() }
        })
        if (existing) return { error: 'An account with this email already exists' }

        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate a simple Player ID
        const randomId = Math.floor(1000 + Math.random() * 9000).toString()
        const generatedPlayerId = (firstName.slice(0, 1) + lastName.slice(0, 1) + randomId).toUpperCase()

        const player = await prisma.player.create({
            data: {
                name: `${firstName} ${lastName}`.trim(),
                email: email.toLowerCase().trim(),
                phone: phone || null,
                password: hashedPassword,
                playerId: generatedPlayerId,
                handicapIndex: 0
            }
        })

        const cookieStore = await cookies()
        cookieStore.set('session_userId', player.id, { httpOnly: true, path: '/' })
        cookieStore.set('auth_status', 'true', { path: '/' })
        cookieStore.set('last_email', email.toLowerCase().trim(), { path: '/', maxAge: 60 * 60 * 24 * 30 })
        cookieStore.set('player_name', player.name, { path: '/' })

        return { success: true }
    } catch (e) {
        console.error('Signup error:', e)
        return { error: 'An error occurred during account creation' }
    }
}

export async function forgotPassword(prevState: any, formData: FormData) {
    const emailInput = formData.get('email') as string
    if (!emailInput) return { error: 'Email is required' }

    const email = emailInput.toLowerCase().trim()

    try {
        const player = await prisma.player.findUnique({
            where: { email }
        })

        if (player) {
            // Generate token
            const token = crypto.randomBytes(32).toString('hex')
            const expiry = new Date(Date.now() + 3600000) // 1 hour from now

            await prisma.player.update({
                where: { id: player.id },
                data: {
                    resetToken: token,
                    resetTokenExpiry: expiry
                }
            })

            // Send email
            const emailResult = await sendResetPasswordEmail(email, token)

            if (isDev) {
                const baseUrl = 'http://localhost:3000'
                const devResetUrl = `${baseUrl}/reset-password?token=${token}`
                console.log('DEBUG: Reset Password Link:', devResetUrl)

                return {
                    success: true,
                    message: `[DEV MODE] Reset link: ${devResetUrl}`
                }
            }

            if (emailResult.error) {
                console.error('Email sending failed:', emailResult.error)
            }
        }

        return { success: true, message: 'If an account exists, a reset link has been sent to your email.' }
    } catch (e) {
        console.error('Forgot password error:', e)
        return { error: 'An error occurred. Please try again later.' }
    }
}

export async function resetPassword(prevState: any, formData: FormData) {
    const token = formData.get('token') as string
    const password = formData.get('password') as string

    if (!token || !password) return { error: 'Token and password are required' }
    if (password.length < 4) return { error: 'Password must be at least 4 characters' }

    try {
        const player = await prisma.player.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date()
                }
            }
        })

        if (!player) {
            return { error: 'Invalid or expired reset token' }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.player.update({
            where: { id: player.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        })

        return { success: true, message: 'Password has been reset successfully.' }
    } catch (e) {
        console.error('Reset password error:', e)
        return { error: 'An error occurred during password reset.' }
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session_userId')
    cookieStore.delete('auth_status')
    cookieStore.delete('player_name')
    cookieStore.delete('admin_session')
    return { success: true }
}

export async function adminLogout() {
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    return { success: true }
}

export async function verifyAdminPassword(password: string) {
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123'
    if (password === adminPass) {
        const cookieStore = await cookies()
        cookieStore.set('admin_session', 'true', { path: '/' })
        return { success: true }
    }
    return { error: 'Incorrect password' }
}
