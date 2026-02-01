'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Allows a user to delete their own live round
 * A round belongs to a user if they are a participant in it
 */
export async function deleteUserLiveRound(liveRoundId: string) {
    try {
        // Get current user from cookies
        const cookieStore = await cookies();
        const sessionUserId = cookieStore.get('session_userId')?.value;

        if (!sessionUserId) {
            return {
                success: false,
                error: 'You must be logged in to delete a round'
            };
        }

        // Check if user is admin
        let isAdmin = cookieStore.get('admin_session')?.value === 'true';

        // Super User Bypass
        if (!isAdmin && sessionUserId) {
            const user = await prisma.player.findUnique({ where: { id: sessionUserId }, select: { email: true } });
            if (user?.email === 'viet53@gmail.com') {
                isAdmin = true;
            }
        }

        if (isAdmin) {
            // Admin can delete anything
        } else {
            // Check if user is a participant in this round
            const userParticipation = await prisma.liveRoundPlayer.findFirst({
                where: {
                    liveRoundId: liveRoundId,
                    playerId: sessionUserId
                }
            });

            // Also check if round has ANY players - if not, allow cleanup
            const roundPlayerCount = await prisma.liveRoundPlayer.count({
                where: { liveRoundId: liveRoundId }
            });

            if (!userParticipation && roundPlayerCount > 0) {
                console.error(`Delete failed: User ${sessionUserId} is not in round ${liveRoundId} and round has ${roundPlayerCount} players.`);
                return {
                    success: false,
                    error: 'You can only delete rounds you participated in'
                };
            }
        }

        // Delete the round (cascade will handle related records)
        await prisma.liveRound.delete({
            where: { id: liveRoundId }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete user live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete round'
        };
    }
}

/**
 * Gets all live rounds that the current user participated in
 */
export async function getUserLiveRounds() {
    try {
        const cookieStore = await cookies();
        const sessionUserId = cookieStore.get('session_userId')?.value;

        if (!sessionUserId) {
            return { success: false, rounds: [], error: 'Not logged in' };
        }

        // Get all rounds where user is a participant
        const userRounds = await prisma.liveRound.findMany({
            where: {
                players: {
                    some: {
                        playerId: sessionUserId
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                date: true,
                createdAt: true
            }
        });

        return { success: true, rounds: userRounds };
    } catch (error) {
        console.error('Failed to get user live rounds:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get rounds',
            rounds: []
        };
    }
}
