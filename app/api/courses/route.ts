
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("API: /api/courses called");

        const courses = await prisma.course.findMany({
            orderBy: { name: 'asc' },
            include: {
                teeBoxes: true,
                holes: {
                    orderBy: { holeNumber: 'asc' }
                }
            }
        });

        return NextResponse.json(courses);
    } catch (error: any) {
        console.error("API Courses Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
