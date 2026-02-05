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
                    },
                    orderBy: { holeNumber: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Use a safer serialization approach for Server Actions
        return JSON.parse(JSON.stringify(courses));
    } catch (error) {
        console.error('getAllCourses Server Action Failed:', error);
        return [];
    }
}
