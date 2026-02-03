
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for LiveRoundPlayers with 18 scores that might be Viet Chu but unlinked...');

    const candidates = await prisma.liveRoundPlayer.findMany({
        where: {
            scores: {
                some: {} // Has at least one score
            },
            NOT: {
                playerId: 'c459efe7-3fe2-43b6-b1b7-3acd7c2375b5'
            }
        },
        include: {
            liveRound: true,
            scores: true
        }
    });

    console.log(`Found ${candidates.length} candidates.`);
    for (const c of candidates) {
        if (c.scores.length === 18) {
            console.log(`  ID: ${c.id}, Name: ${c.guestName}, Round: ${c.liveRound.name}, Date: ${c.liveRound.date}, Scores: ${c.scores.length}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
