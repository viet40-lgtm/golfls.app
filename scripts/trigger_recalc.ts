import { prisma } from '../lib/prisma';
import { recalculateAllHandicaps } from '../app/actions/recalculate-handicaps';

async function main() {
    console.log('Starting handicap recalculation for imported rounds...');
    try {
        const result = await recalculateAllHandicaps();
        console.log('Result:', result.message);

        const player = await prisma.player.findFirst({
            where: { name: { contains: 'Viet Chu' } }
        });

        if (player) {
            console.log(`\nNew Handicap Index for ${player.name}: ${player.handicapIndex}`);
        }
    } catch (error) {
        console.error('Error during recalculation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
