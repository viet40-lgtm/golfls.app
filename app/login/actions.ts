'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'


export async function login(formData: FormData) {
    const supabase = await createClient()

    const identifier = formData.get('email') as string
    const password = formData.get('password') as string

    let email = identifier
    // If it doesn't look like an email, try looking up by Player ID
    if (!identifier.includes('@')) {
        const player = await prisma.player.findUnique({
            where: { playerId: identifier },
            select: { email: true }
        })
        if (player?.email) {
            email = player.email
        } else {
            return { success: false, error: "Player ID not found" }
        }
    }

    let result;
    try {
        result = await supabase.auth.signInWithPassword({
            email,
            password,
        })
    } catch (e: any) {
        console.error("Supabase Login Error:", e)
        return { success: false, error: "Connection error. Please try again later." }
    }

    const { data, error } = result;

    if (error) {
        return { success: false, error: error.message }
    }

    // Bridge to Legacy Auth: Set cookies the app expects
    if (data.user) {
        const cookieStore = await cookies()
        cookieStore.set('session_userId', data.user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })
        cookieStore.set('auth_status', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string

    if (!email || !password || password.length < 4) {
        return { success: false, error: "Password must be at least 4 characters long" }
    }
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string

    const fullName = `${firstName} ${lastName}`.trim()

    let result;
    try {
        result = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone
                }
            }
        })
    } catch (e: any) {
        console.error("Supabase Signup Error:", e)
        return { success: false, error: "Connection error during signup." }
    }

    const { data, error } = result;

    if (error) {
        return { success: false, error: error.message }
    }

    // Bridge to Legacy DB: Sync to Prisma Player Table
    if (data.user) {
        try {
            const playerId = (firstName && phone) ? (firstName.charAt(0) + phone.replace(/\D/g, '').slice(-4)).toUpperCase() : null;

            await prisma.player.upsert({
                where: { email: email.toLowerCase() },
                update: {
                    id: data.user.id, // Unify ID with Supabase if possible
                    name: fullName,
                    phone: phone,
                    playerId: playerId
                },
                create: {
                    id: data.user.id,
                    name: fullName,
                    email: email.toLowerCase(),
                    phone: phone,
                    playerId: playerId,
                    handicapIndex: 0
                }
            })
        } catch (dbError) {
            console.error("Prisma Sync Error during Signup:", dbError);
        }
    }

    // Check if a session was created (if email confirmation is off)
    if (data.session && data.user) {
        const cookieStore = await cookies()
        cookieStore.set('session_userId', data.user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })
        cookieStore.set('auth_status', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })
        revalidatePath('/', 'layout')
        redirect('/')
    }

    // If confirmation is on, return success message
    return {
        success: true,
        message: 'Please check your email to confirm your account.'
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/auth')
}

export async function signInWithGitHub() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        },
    })

    if (error) {
        throw new Error(error.message)
    }

    if (data.url) {
        redirect(data.url)
    }
}
