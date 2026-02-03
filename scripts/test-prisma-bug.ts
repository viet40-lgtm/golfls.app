import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const sessionUserId = 'INVALID-ID'
    try {
        console.log('Testing with INVALID-ID...')
        const lastUserRoundPlayer = await prisma.liveRoundPlayer.findFirst({
            where: { playerId: sessionUserId },
            orderBy: { liveRound: { date: 'desc' } }
        })
        console.log('Result found:', lastUserRoundPlayer)
    } catch (error) {
        console.error('Error caught:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
