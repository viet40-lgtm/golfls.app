const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rounds = await prisma.liveRound.findMany({
        include: {
            players: {
                include: {
                    player: true
                }
            }
        }
    });

    console.log(`Found ${rounds.length} rounds.`);

    for (const round of rounds) {
        let initial = 'R';

        // Find the first player (non-guest preferred)
        const firstPlayer = round.players.find(p => !p.isGuest && p.player);
        const firstGuest = round.players.find(p => p.isGuest);

        if (firstPlayer && firstPlayer.player && firstPlayer.player.name) {
            initial = firstPlayer.player.name[0].toUpperCase();
        } else if (firstGuest && firstGuest.guestName) {
            initial = firstGuest.guestName[0].toUpperCase();
        } else if (round.name) {
            // Fallback to name if it doesn't start with "Live Round" or "Tue-"
            const name = round.name.replace(/^(Live Round|Tue|Wed|Thu|Fri|Sat|Sun|Mon)[^a-zA-Z]*/i, '');
            initial = (name[0] || round.name[0] || 'R').toUpperCase();
        }

        let isUnique = false;
        while (!isUnique) {
            const randomNums = Math.floor(100 + Math.random() * 900).toString();
            shortId = `${initial}${randomNums}`;

            const existing = await prisma.liveRound.findUnique({
                where: { shortId }
            });
            if (!existing) isUnique = true;
        }

        await prisma.liveRound.update({
            where: { id: round.id },
            data: { shortId }
        });
        console.log(`Updated round ${round.id} (${round.name}) with shortId: ${shortId}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
