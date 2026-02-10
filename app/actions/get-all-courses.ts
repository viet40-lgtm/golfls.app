'use server'

import { prisma } from '@/lib/prisma'

export async function getAllCourses() {
    const courses = await prisma.course.findMany({
        include: {
            teeBoxes: true
        },
        orderBy: { name: 'asc' }
    });

    return JSON.parse(JSON.stringify(courses));
}
