import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function getSession() {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('session_userId')?.value

        if (!userId) return null

        const player = await prisma.player.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true
            }
        })

        if (!player) return null

        return {
            id: player.id,
            email: player.email,
            name: player.name
        }
    } catch (error) {
        console.error('getSession error:', error)
        return null
    }
}
