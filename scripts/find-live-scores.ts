
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for LiveRoundPlayers with name Viet or Chu...');

    const lrps = await prisma.liveRoundPlayer.findMany({
        where: {
            OR: [
                { guestName: { contains: 'Viet', mode: 'insensitive' } },
                { guestName: { contains: 'Chu', mode: 'insensitive' } }
            ]
        },
        include: {
            liveRound: true,
            scores: true,
            player: true
        }
    });

    for (const lrp of lrps) {
        if (lrp.scores.length > 0) {
            console.log(`FOUND matches: LRP ID: ${lrp.id}, Guest: ${lrp.guestName}, Round: ${lrp.liveRound.name}, Date: ${lrp.liveRound.date}, Scores: ${lrp.scores.length}, PlayerID: ${lrp.playerId}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
