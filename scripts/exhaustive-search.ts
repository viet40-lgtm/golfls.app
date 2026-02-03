
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for any guest or player named Viet or Chu with scores...');

    const lrps = await prisma.liveRoundPlayer.findMany({
        where: {
            OR: [
                { guestName: { contains: 'Viet', mode: 'insensitive' } },
                { guestName: { contains: 'Chu', mode: 'insensitive' } },
                { guestName: { contains: 'V61', mode: 'insensitive' } }
            ]
        },
        include: {
            liveRound: true,
            scores: true,
            player: true
        }
    });

    console.log(`Found ${lrps.length} candidate LiveRoundPlayers`);

    for (const lrp of lrps) {
        console.log(`LRP ID: ${lrp.id}`);
        console.log(`  Round: ${lrp.liveRound.name} (${lrp.liveRound.date})`);
        console.log(`  Guest Name: ${lrp.guestName}`);
        console.log(`  Player Name: ${lrp.player?.name}`);
        console.log(`  Player ID: ${lrp.playerId}`);
        console.log(`  Scores count: ${lrp.scores.length}`);
        console.log('---');
    }

    const rps = await prisma.roundPlayer.findMany({
        where: {
            OR: [
                { name: { contains: 'Viet', mode: 'insensitive' } },
                { name: { contains: 'Chu', mode: 'insensitive' } },
                { name: { contains: 'V61', mode: 'insensitive' } }
            ]
        },
        include: {
            round: true,
            scores: true,
            player: true
        }
    });

    console.log(`Found ${rps.length} candidate RoundPlayers`);
    for (const rp of rps) {
        console.log(`RP ID: ${rp.id}`);
        console.log(`  Round: ${rp.round.name} (${rp.round.date})`);
        console.log(`  Name: ${rp.name}`);
        console.log(`  Player Name: ${rp.player?.name}`);
        console.log(`  Player ID: ${rp.playerId}`);
        console.log(`  Scores count: ${rp.scores.length}`);
        console.log('---');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
