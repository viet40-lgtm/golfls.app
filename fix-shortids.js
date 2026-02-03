const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rounds = await prisma.liveRound.findMany({
        include: {
            players: {
                include: {
                    player: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            }
        }
    });

    console.log(`Found ${rounds.length} rounds.`);

    for (const round of rounds) {
        let initial = 'R';

        // Find the first non-guest player
        const firstPlayer = round.players.find(p => !p.isGuest && p.player);
        if (firstPlayer && firstPlayer.player && firstPlayer.player.name) {
            initial = firstPlayer.player.name[0].toUpperCase();
        } else if (round.players.length > 0 && round.players[0].guestName) {
            initial = round.players[0].guestName[0].toUpperCase();
        } else if (round.name) {
            // Fallback to name if no players (unlikely)
            initial = round.name[0].toUpperCase();
        }

        const currentShortId = round.shortId;
        const currentInitial = currentShortId ? currentShortId[0] : '';

        if (currentInitial !== initial) {
            let shortId = '';
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 10) {
                const randomNums = Math.floor(100 + Math.random() * 900).toString();
                shortId = `${initial}${randomNums}`;

                const existing = await prisma.liveRound.findUnique({
                    where: { shortId }
                });
                if (!existing) isUnique = true;
                attempts++;
            }

            await prisma.liveRound.update({
                where: { id: round.id },
                data: { shortId }
            });
            console.log(`Updated round ${round.name}: ${currentShortId} -> ${shortId}`);
        } else {
            console.log(`Round ${round.name} already has correct initial: ${currentShortId}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
