'use server';

import { prisma } from '@/lib/prisma';

/**
 * Backfills course_name for all existing rounds that are missing it
 */
export async function backfillCourseName() {
    try {
        // Get all rounds missing course_name
        const rounds = await prisma.round.findMany({
            where: {
                courseName: null
            },
            include: {
                course: true
            }
        });

        let updated = 0;
        let skipped = 0;
        const details: string[] = [];

        for (const round of rounds) {
            if (!round.course) {
                details.push(`Skipped round ${round.id} - course not found`);
                skipped++;
                continue;
            }

            await prisma.round.update({
                where: { id: round.id },
                data: {
                    courseName: round.course.name
                }
            });

            updated++;
        }

        // Also backfill LiveRounds
        const liveRounds = await prisma.liveRound.findMany({
            where: {
                courseName: null
            },
            include: {
                course: true
            }
        });

        for (const liveRound of liveRounds) {
            if (!liveRound.course) {
                details.push(`Skipped live round ${liveRound.id} - course not found`);
                skipped++;
                continue;
            }

            await prisma.liveRound.update({
                where: { id: liveRound.id },
                data: {
                    courseName: liveRound.course.name
                }
            });

            updated++;
        }

        return {
            success: true,
            message: `Backfill complete! Updated: ${updated} rounds, Skipped: ${skipped}`,
            updated,
            skipped,
            details
        };

    } catch (error) {
        console.error('Error during backfill:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            error: String(error)
        };
    }
}
