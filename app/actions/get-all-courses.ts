'use server'

import { prisma } from '@/lib/prisma'

export async function getAllCourses() {
    const courses = await prisma.course.findMany({
        include: {
            teeBoxes: true,
            _count: { select: { holes: true } }
        },
        orderBy: { name: 'asc' }
    });

    return courses.map(c => ({
        id: String(c.id),
        name: String(c.name),
        holeCount: Number(c._count.holes),
        teeBoxes: c.teeBoxes.map(t => ({
            id: String(t.id),
            name: String(t.name),
            rating: Number(t.rating),
            slope: Number(t.slope),
            par: Number(t.par)
        }))
    }));
}
