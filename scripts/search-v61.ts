
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for V61 in all player-related fields...');

    const lrps = await prisma.liveRoundPlayer.findMany({
        where: {
            OR: [
                { guestName: { contains: 'V61', mode: 'insensitive' } },
                { player: { name: { contains: 'V61', mode: 'insensitive' } } }
            ]
        },
        include: { liveRound: true, scores: true }
    });

    console.log(`LiveRoundPlayers with V61: ${lrps.length}`);
    for (const lrp of lrps) {
        console.log(`  ID: ${lrp.id}, Guest: ${lrp.guestName}, Round: ${lrp.liveRound.name}, Scores: ${lrp.scores.length}, PlayerID: ${lrp.playerId}`);
    }

    const rps = await prisma.roundPlayer.findMany({
        where: {
            OR: [
                { name: { contains: 'V61', mode: 'insensitive' } },
                { player: { name: { contains: 'V61', mode: 'insensitive' } } }
            ]
        },
        include: { round: true, scores: true }
    });

    console.log(`RoundPlayers with V61: ${rps.length}`);
    for (const rp of rps) {
        console.log(`  ID: ${rp.id}, Name: ${rp.name}, Round: ${rp.round.name}, Scores: ${rp.scores.length}, PlayerID: ${rp.playerId}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
