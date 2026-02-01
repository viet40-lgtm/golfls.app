const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateScoreDifferential(grossScore, rating, slope, pcc = 0) {
    const diff = ((grossScore - rating - pcc) * 113) / slope;
    return Number(diff.toFixed(1));
}

function getDifferentialsConfiguration(count) {
    if (count < 3) return { itemsToUse: 0 };
    if (count === 3) return { itemsToUse: 1 };
    if (count === 4) return { itemsToUse: 1 };
    if (count === 5) return { itemsToUse: 1 };
    if (count === 6) return { itemsToUse: 2 };
    if (count <= 8) return { itemsToUse: 2 };
    if (count <= 11) return { itemsToUse: 3 };
    if (count <= 14) return { itemsToUse: 4 };
    if (count <= 16) return { itemsToUse: 5 };
    if (count <= 18) return { itemsToUse: 6 };
    if (count === 19) return { itemsToUse: 7 };
    return { itemsToUse: 8 };
}

function calculateHandicap(rounds) {
    let allDifferentials = rounds.map((r) => {
        const value = calculateScoreDifferential(r.score, r.rating, r.slope, 0);
        return { id: r.id, date: r.date, value };
    });

    allDifferentials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentDifferentials = allDifferentials.slice(0, 20);
    const count = recentDifferentials.length;

    if (count < 6) return { handicapIndex: 0 };

    const { itemsToUse } = getDifferentialsConfiguration(count);
    const sortedByValue = [...recentDifferentials].sort((a, b) => a.value - b.value);
    const usedDifferentials = sortedByValue.slice(0, itemsToUse);

    const sum = usedDifferentials.reduce((acc, d) => acc + d.value, 0);
    const average = sum / itemsToUse;
    return { handicapIndex: Number(average.toFixed(1)) };
}

async function main() {
    console.log('Recalculating Viet Chu handicap...');
    try {
        const player = await prisma.player.findFirst({
            where: { name: { contains: 'Viet Chu' } },
            include: {
                rounds: {
                    include: { round: true, teeBox: true }
                }
            }
        });

        if (!player) {
            console.log('Player not found');
            return;
        }

        const validRounds = player.rounds
            .filter(rp => rp.grossScore && rp.teeBox)
            .map(rp => ({
                id: rp.id,
                date: rp.round.date,
                score: rp.grossScore,
                rating: rp.teeBox.rating,
                slope: rp.teeBox.slope,
                timestamp: new Date(rp.round.date).getTime()
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        const currentHistory = [];
        for (const round of validRounds) {
            const statsBefore = calculateHandicap(currentHistory);
            await prisma.roundPlayer.update({
                where: { id: round.id },
                data: { indexAtTime: statsBefore.handicapIndex }
            });
            currentHistory.push(round);
        }

        const finalStats = calculateHandicap(currentHistory);
        await prisma.player.update({
            where: { id: player.id },
            data: { handicapIndex: finalStats.handicapIndex }
        });

        console.log(`\nSUCCESS! Viet Chu's new Index: ${finalStats.handicapIndex}`);
        console.log(`Processed ${currentHistory.length} rounds.`);

    } catch (err) {
        console.error('Recalc Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
