'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) return { error: 'Please enter both Email and Password' }
    if (password.length < 4) return { error: 'Password must be at least 4 characters' }

    try {
        const player = await prisma.player.findUnique({
            where: { email: email.toLowerCase().trim() }
        })

        if (!player || !player.password || !(await bcrypt.compare(password, player.password))) {
            return { error: 'Invalid Email or Password' }
        }

        const cookieStore = await cookies()
        cookieStore.set('session_userId', player.id, { httpOnly: true, path: '/' })
        cookieStore.set('auth_status', 'true', { path: '/' })
        cookieStore.set('last_email', email.toLowerCase().trim(), { path: '/', maxAge: 60 * 60 * 24 * 30 })

        if (player.name) {
            cookieStore.set('player_name', player.name, { path: '/' })
        }

        return { success: true }
    } catch (e) {
        console.error('Login error:', e)
        return { error: 'An error occurred during sign in' }
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
    const email = formData.get('email') as string
    if (!email) return { error: 'Email is required' }

    try {
        const player = await prisma.player.findUnique({
            where: { email: email.toLowerCase().trim() }
        })

        // In a real app, send email here.
        return { success: true, message: 'If an account exists, a reset link has been sent to your email.' }
    } catch (e) {
        return { error: 'An error occurred. Please try again later.' }
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
