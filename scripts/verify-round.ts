
import { prisma } from '@/lib/prisma';

async function verifyLastRound() {
    try {
        console.log("Searching for Viet's last round...");
        const user = await prisma.player.findFirst({
            where: {
                OR: [
                    { email: 'viet53@gmail.com' },
                    { name: { contains: 'Viet', mode: 'insensitive' } }
                ]
            }
        });

        if (!user) {
            console.log("User 'Viet' not found.");
            return;
        }
        console.log(`Found User: ${user.name} (${user.id})`);

        // Find last live round participation
        const lastParticipation = await prisma.liveRoundPlayer.findFirst({
            where: { playerId: user.id },
            orderBy: { liveRound: { createdAt: 'desc' } },
            include: {
                liveRound: true,
                scores: true
            }
        });

        if (!lastParticipation) {
            console.log("No live round participation found.");
            return;
        }

        console.log(`\n--- Round: ${lastParticipation.liveRound.name} ---`);
        console.log(`Date: ${lastParticipation.liveRound.date}`);
        console.log(`Round ID: ${lastParticipation.liveRound.id}`);
        console.log(`Player: ${lastParticipation.guestName || user.name}`);
        console.log(`Total Scores Recorded: ${lastParticipation.scores.length}`);

        const scoresMap = new Map();
        lastParticipation.scores.forEach(s => {
            // We need to fetch the hole number to be sure which hole it is.
            // But we don't have hole info loaded in this query.
            scoresMap.set(s.holeId, s.strokes);
        });

        // Let's get the holes for this course to map IDs to numbers
        const course = await prisma.course.findUnique({
            where: { id: lastParticipation.liveRound.courseId },
            include: { holes: true }
        });

        if (!course) {
            console.log("Course not found.");
            return;
        }

        const sortedHoles = course.holes.sort((a, b) => a.holeNumber - b.holeNumber);

        console.log("\n--- Hole-by-Hole Verification ---");
        let missingHoles = [];
        let completedHoles = 0;

        for (const hole of sortedHoles) {
            const scoreEntry = lastParticipation.scores.find(s => s.holeId === hole.id);
            if (scoreEntry) {
                console.log(`Hole ${hole.holeNumber}: ${scoreEntry.strokes} (Saved)`);
                completedHoles++;
            } else {
                console.log(`Hole ${hole.holeNumber}: MISSING`);
                missingHoles.push(hole.holeNumber);
            }
        }

        console.log(`\nSummary: ${completedHoles}/18 holes saved.`);
        if (missingHoles.length === 0) {
            console.log("✅ ALL HOLES SAVED SUCCESSFULLY IN DB.");
        } else {
            console.log("❌ MISSING SCORES FOR HOLES: " + missingHoles.join(', '));
        }

    } catch (e) {
        console.error("Error verifying round:", e);
    }
}

verifyLastRound()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
