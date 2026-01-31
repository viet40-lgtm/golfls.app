'use server';

import { prisma } from '@/lib/prisma';

export async function checkCoursePar() {
    try {
        const course = await prisma.course.findFirst({
            where: {
                name: {
                    contains: 'North',
                    mode: 'insensitive'
                }
            },
            include: {
                holes: {
                    orderBy: {
                        holeNumber: 'asc'
                    }
                },
                teeBoxes: true
            }
        });

        if (!course) {
            return { success: false, message: 'Course not found' };
        }

        const holes = course.holes.map(h => ({
            hole: h.holeNumber,
            par: h.par
        }));

        const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);

        return {
            success: true,
            courseName: course.name,
            totalPar,
            holes,
            teeBoxes: course.teeBoxes.map(t => ({
                name: t.name,
                rating: t.rating,
                slope: t.slope
            }))
        };

    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
