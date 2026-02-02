'use server'

import { prisma } from '@/lib/prisma'

export async function getAllCourses() {
    const courses = await prisma.course.findMany({
        include: {
            teeBoxes: true,
            holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } }
        },
        orderBy: { name: 'asc' }
    });

    return JSON.parse(JSON.stringify(courses));
}
