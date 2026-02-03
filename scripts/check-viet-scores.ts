
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const vietId = 'c459efe7-3fe2-43b6-b1b7-3acd7c2375b5';

    console.log('Fetching all RoundPlayers for Viet Chu...');
    const rounds = await prisma.roundPlayer.findMany({
        where: { playerId: vietId },
        include: {
            round: true,
            scores: true
        }
    });

    console.log(`Found ${rounds.length} historical rounds.`);
    for (const r of rounds) {
        console.log(`Round: ${r.round.name} (${r.round.date}), Scores Recorded: ${r.scores.length}`);
    }

    console.log('\nFetching all LiveRoundPlayers for Viet Chu...');
    const liveRounds = await prisma.liveRoundPlayer.findMany({
        where: { playerId: vietId },
        include: {
            liveRound: true,
            scores: true
        }
    });

    console.log(`Found ${liveRounds.length} live rounds.`);
    for (const r of liveRounds) {
        console.log(`Live Round: ${r.liveRound.name} (${r.liveRound.date}), Scores Recorded: ${r.scores.length}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
