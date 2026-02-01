
import { prisma } from '../lib/prisma';

async function main() {
    console.log('Fetching latest live round...');

    const latestRound = await prisma.liveRound.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: {
            players: {
                include: {
                    player: true,
                    scores: {
                        orderBy: { hole: { holeNumber: 'asc' } },
                        include: { hole: true }
                    }
                }
            }
        }
    });

    if (!latestRound) {
        console.log('No live rounds found.');
        return;
    }

    console.log(`Latest Round: ${latestRound.name} (${latestRound.id})`);
    console.log(`Date: ${latestRound.date}`);
    console.log('--- SCORE DUMP ---');

    for (const p of latestRound.players) {
        // Safe name access
        const name = p.player?.name || p.guestName || 'Unknown Player';
        console.log(`Player: ${name} (ID: ${p.playerId || p.id})`);

        if (p.scores.length === 0) {
            console.log('  No scores recorded.');
        } else {
            const scoreMap = p.scores.map(s => `${s.hole.holeNumber}:${s.strokes}`).join(', ');
            console.log(`  Scores [Hole:Strokes]: ${scoreMap}`);
        }
        console.log('------------------');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
