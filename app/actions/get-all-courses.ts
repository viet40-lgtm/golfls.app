'use server'

import { prisma } from '@/lib/prisma'

export async function getAllCourses() {
    try {
        const courses = await prisma.course.findMany({
            include: {
                teeBoxes: true,
                holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } },
                _count: {
                    select: {
                        rounds: true,
                        liveRounds: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return JSON.parse(JSON.stringify(courses));
    } catch (error) {
        console.error('getAllCourses Server Action Failed:', error);
        return [];
    }
}
