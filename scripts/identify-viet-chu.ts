
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const vietId = 'c459efe7-3fe2-43b6-b1b7-3acd7c2375b5';

    // Find LiveRoundPlayer entries that are unlinked but named Viet Chu
    const unlinkedLive = await prisma.liveRoundPlayer.findMany({
        where: {
            OR: [
                { guestName: { contains: 'Viet', mode: 'insensitive' } },
                { AND: [{ playerId: null }, { guestName: { contains: 'Viet', mode: 'insensitive' } }] }
            ],
            NOT: {
                playerId: vietId
            }
        },
        include: {
            liveRound: true,
            scores: true
        }
    });

    console.log('Unlinked LiveRoundPlayers found:', unlinkedLive.length);
    for (const lrp of unlinkedLive) {
        console.log(`LRP ID: ${lrp.id}, GuestName: ${lrp.guestName}, Round: ${lrp.liveRound.name}, Scores: ${lrp.scores.length}`);
    }

    // Find RoundPlayer entries that are unlinked but named Viet Chu
    const unlinkedHistorical = await prisma.roundPlayer.findMany({
        where: {
            name: { contains: 'Viet', mode: 'insensitive' },
            NOT: {
                playerId: vietId
            }
        },
        include: {
            round: true,
            scores: true
        }
    });

    console.log('\nUnlinked RoundPlayers found:', unlinkedHistorical.length);
    for (const rp of unlinkedHistorical) {
        console.log(`RP ID: ${rp.id}, Name: ${rp.name}, Round: ${rp.round.name}, Scores: ${rp.scores.length}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
