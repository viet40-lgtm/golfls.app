
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("API: /api/players called");
        // For now, return the Diagnostic Mock to be safe, or try DB?
        // Let's try DB since test-db worked. 
        // If this crashes, the API response will simply be 500, but we can see the error.

        /* 
        const players = await prisma.player.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, index: true, preferred_tee_box: true, email: true }
        });
        */

        // Use Mock for now to guarantee stability first
        const mock = [
            {
                id: 'mock-player',
                name: 'Diagnostic User',
                index: 0,
                preferred_tee_box: 'White',
                email: 'diag@example.com'
            }
        ];

        return NextResponse.json(mock);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
