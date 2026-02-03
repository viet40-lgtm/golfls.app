
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for any unlinked players with scores...');

    const unlinkedLive = await prisma.liveRoundPlayer.findMany({
        where: {
            playerId: null
        },
        include: {
            liveRound: true,
            scores: true
        }
    });

    console.log(`Unlinked LiveRoundPlayers: ${unlinkedLive.length}`);
    for (const lrp of unlinkedLive) {
        if (lrp.scores.length > 0) {
            console.log(`  ID: ${lrp.id}, GuestName: ${lrp.guestName}, Round: ${lrp.liveRound.name}, Scores: ${lrp.scores.length}`);
        }
    }

    const unlinkedHistorical = await prisma.roundPlayer.findMany({
        where: {
            playerId: null // Actually playerId is required in RoundPlayer schema
        },
        include: {
            round: true,
            scores: true
        }
    }).catch(() => []); // It might error because it's required

    console.log(`Unlinked RoundPlayers: ${unlinkedHistorical.length}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
