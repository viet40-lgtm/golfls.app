'use server'

import { prisma } from '@/lib/prisma'

export async function getAllCourses() {
    try {
        const courses = await prisma.course.findMany({
            select: {
                id: true,
                name: true,
                teeBoxes: {
                    select: {
                        id: true,
                        name: true,
                        rating: true,
                        slope: true,
                        par: true
                    }
                },
                holes: {
                    select: {
                        holeNumber: true,
                        par: true,
                        difficulty: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Manual sort of holes within courses to avoid Prisma Relation Sort issues
        const sortedCourses = courses.map(course => ({
            ...course,
            holes: [...course.holes].sort((a, b) => a.holeNumber - b.holeNumber)
        }));

        return JSON.parse(JSON.stringify(sortedCourses));
    } catch (error) {
        console.error('getAllCourses Failed:', error);
        return [];
    }
}
