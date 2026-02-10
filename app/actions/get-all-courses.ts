'use server'

import { prisma } from '@/lib/prisma'

export async function getAllCourses() {
    try {
        const courses = await prisma.course.findMany({
            include: {
                teeBoxes: true,
                _count: { select: { holes: true } }
            },
            orderBy: { name: 'asc' }
        });

        if (!courses) return [];

        return courses.map(c => ({
            id: String(c.id || ''),
            name: String(c.name || 'Unknown Course'),
            holeCount: Number(c._count?.holes || 0),
            teeBoxes: (c.teeBoxes || []).map(t => ({
                id: String(t.id),
                name: String(t.name || ''),
                rating: Number(t.rating || 0),
                slope: Number(t.slope || 0),
                par: Number(t.par || 72)
            }))
        }));
    } catch (e) {
        console.error('Error in getAllCourses:', e);
        // Return empty array to keep client logic simple, or throw handled error
        return [];
    }
}
