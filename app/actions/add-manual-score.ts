'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Import recalculate function
import { recalculatePlayerHandicap } from './recalculate-player';

export async function addManualScore(formData: FormData) {
    const playerId = formData.get('playerId') as string;
    const datePlayed = formData.get('datePlayed') as string;
    const grossScore = formData.get('grossScore') as string;
    // Adjusted Score logic is handled via recalculate, but we capture gross here.
    // If the user inputs adjusted directly, we'll store it as gross for simplicity 
    // or we'd need netScore field. The prompt used grossScore.

    if (!playerId || !datePlayed || !grossScore) {
        return { success: false, error: 'All fields are required' };
    }

    try {
        // Get generic course info (since manual entry might not specify course, use first available)
        const course = await prisma.course.findFirst({
            include: {
                teeBoxes: true // Correct relation name
            }
        });

        if (!course) {
            return { success: false, error: 'No courses available' };
        }

        // Default to White tee or first available
        const teeBox = course.teeBoxes.find(t => t.name === 'White') || course.teeBoxes[0];

        if (!teeBox) {
            return { success: false, error: 'Tee box not found' };
        }

        // Create a wrapper Round
        const round = await prisma.round.create({
            data: {
                date: datePlayed,
                courseId: course.id,
                courseName: course.name,
                name: 'Manual Entry',
                isTournament: false
            }
        });

        // Create RoundPlayer entry
        await prisma.roundPlayer.create({
            data: {
                roundId: round.id,
                playerId: playerId,
                teeBoxId: teeBox.id,
                grossScore: parseInt(grossScore),
                courseHandicap: 0 // Placeholder, recalculate will handle index update
            }
        });

        // Trigger Recalculation
        await recalculatePlayerHandicap(playerId);

        revalidatePath('/players');
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to add manual score:', error);
        return { success: false, error: 'Failed to add manual score' };
    }
}
