'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateCourse(
    courseId: string,
    data: {
        name: string,
        tees: { id?: string, name: string, rating: number, slope: number, yardages?: number[] }[],
        holes: {
            id?: string,
            holeNumber: number,
            par: number,
            difficulty: number | null,
            latitude?: number | null,
            longitude?: number | null,
            /* elements removed */
            elements?: {
                side: string;
                elementNumber: number;
                frontLatitude?: number | null;
                frontLongitude?: number | null;
                backLatitude?: number | null;
                backLongitude?: number | null;
                water: boolean;
                bunker: boolean;
                tree: boolean;
            }[]
        }[]
    }
) {
    // 1. Update Course Name
    await prisma.course.update({
        where: { id: courseId },
        data: { name: data.name }
    });

    // 2. Update Holes
    // We expect 18 holes. Upsert is safe.
    for (const hole of data.holes) {
        if (hole.id) {
            await prisma.hole.update({
                where: { id: hole.id },
                data: {
                    par: hole.par,
                    difficulty: hole.difficulty,
                }
            });

            // Use raw SQL for coordinates to bypass Prisma Client validation issues in the dev server cache
            if (hole.latitude !== undefined || hole.longitude !== undefined) {
                await prisma.$executeRaw`UPDATE holes SET latitude = ${hole.latitude}, longitude = ${hole.longitude} WHERE id = ${hole.id}`;
            }

            // Elements Update (Delete All + Recreate)
            if (hole.elements) {
                // Delete existing elements for this hole
                await prisma.holeElement.deleteMany({
                    where: { holeId: hole.id }
                });

                // Create new elements
                if (hole.elements.length > 0) {
                    await prisma.holeElement.createMany({
                        data: hole.elements.map(e => ({
                            holeId: hole.id!,
                            side: e.side,
                            elementNumber: e.elementNumber,
                            frontLatitude: e.frontLatitude,
                            frontLongitude: e.frontLongitude,
                            backLatitude: e.backLatitude,
                            backLongitude: e.backLongitude,
                            water: e.water,
                            bunker: e.bunker,
                            tree: e.tree
                        }))
                    });
                }
            }
        }
    }

    // 3. Update Tee Boxes
    // Handle updates and creation. Deletion is tricky in this simplified view, usually separate action.
    // For now, we only update existing or create new if passed without ID or with temp ID.
    for (const tee of data.tees) {
        // Calculate total par for the course
        const totalPar = data.holes.reduce((sum, h) => sum + h.par, 0) || 72;

        if (tee.id && !tee.id.startsWith('temp-')) {
            await prisma.teeBox.update({
                where: { id: tee.id },
                data: { name: tee.name, rating: tee.rating, slope: tee.slope, par: totalPar }
            });
        } else {
            await prisma.teeBox.create({
                data: {
                    courseId: courseId,
                    name: tee.name,
                    rating: tee.rating,
                    slope: tee.slope,
                    par: totalPar
                }
            });
        }
    }

    revalidatePath('/settings');
    revalidatePath(`/settings/course/${courseId}/edit`);
    redirect('/settings');
}

export async function deleteCourse(courseId: string) {
    // 1. Check for rounds
    const roundsCount = await prisma.round.count({
        where: { courseId: courseId }
    });

    const liveRoundsCount = await prisma.liveRound.count({
        where: { courseId: courseId }
    });

    if (roundsCount > 0 || liveRoundsCount > 0) {
        return { success: false, error: `Cannot delete course with ${roundsCount} rounds and ${liveRoundsCount} live rounds associated.` };
    }

    try {
        // 2. Delete dependencies first (Holes, TeeBoxes)
        // Prisma cascade might handle this, but being explicit is safe
        await prisma.hole.deleteMany({ where: { courseId: courseId } });
        await prisma.teeBox.deleteMany({ where: { courseId: courseId } });

        // 3. Delete Course
        await prisma.course.delete({ where: { id: courseId } });

        revalidatePath('/settings');
        return { success: true };
    } catch (e) {
        console.error('Failed to delete course:', e);
        return { success: false, error: 'Failed to delete course' };
    }
}
