'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function deleteAllLiveRounds() {
    // Check admin permission
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    if (!isAdmin) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Delete all live rounds (cascade will delete players and scores)
        await prisma.liveRound.deleteMany({});

        revalidatePath('/');
        return { success: true, message: 'All live rounds deleted' };
    } catch (error) {
        console.error('Failed to delete all live rounds:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete rounds'
        };
    }
}
