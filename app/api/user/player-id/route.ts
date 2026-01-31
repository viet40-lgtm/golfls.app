import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getSession();

        if (!session?.playerId) {
            return NextResponse.json({ playerId: null });
        }

        return NextResponse.json({ playerId: session.playerId });
    } catch (error) {
        console.error('Error fetching player ID:', error);
        return NextResponse.json({ playerId: null });
    }
}
