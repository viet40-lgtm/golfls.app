'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface CreateMoneyEventInput {
    roundId: string;
    playerId: string;
    holeNumber: number;
    eventType: 'birdie' | 'eagle' | 'albatross' | 'skin' | 'other';
    amount: number;
}

/**
 * Create a new money event
 */
export async function createMoneyEvent(input: CreateMoneyEventInput) {
    try {
        const moneyEvent = await prisma.$executeRaw`
      INSERT INTO money_events (id, round_id, player_id, hole_number, event_type, amount, created_at)
      VALUES (gen_random_uuid(), ${input.roundId}, ${input.playerId}, ${input.holeNumber}, ${input.eventType}, ${input.amount}, NOW())
    `;

        revalidatePath('/scores');
        revalidatePath('/');

        return { success: true, data: moneyEvent };
    } catch (error) {
        console.error('Error creating money event:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create money event'
        };
    }
}

/**
 * Get all money events for a round
 */
export async function getMoneyEventsByRound(roundId: string) {
    try {
        const events = await prisma.$queryRaw<Array<{
            id: string;
            round_id: string;
            player_id: string;
            hole_number: number;
            event_type: string;
            amount: number;
            created_at: Date;
            player_name?: string;
        }>>`
      SELECT 
        me.*,
        p.name as player_name
      FROM money_events me
      LEFT JOIN players p ON me.player_id = p.id
      WHERE me.round_id = ${roundId}
      ORDER BY me.hole_number, me.created_at
    `;

        return { success: true, data: events };
    } catch (error) {
        console.error('Error fetching money events:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch money events'
        };
    }
}

/**
 * Get money event totals for all players in a round
 */
export async function getMoneyTotalsByRound(roundId: string) {
    try {
        const totals = await prisma.$queryRaw<Array<{
            player_id: string;
            player_name: string;
            total_amount: number;
            event_count: number;
        }>>`
      SELECT 
        me.player_id,
        p.name as player_name,
        SUM(me.amount) as total_amount,
        COUNT(*) as event_count
      FROM money_events me
      LEFT JOIN players p ON me.player_id = p.id
      WHERE me.round_id = ${roundId}
      GROUP BY me.player_id, p.name
      ORDER BY total_amount DESC
    `;

        return { success: true, data: totals };
    } catch (error) {
        console.error('Error fetching money totals:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch money totals'
        };
    }
}

/**
 * Delete a money event
 */
export async function deleteMoneyEvent(eventId: string) {
    try {
        await prisma.$executeRaw`
      DELETE FROM money_events WHERE id = ${eventId}
    `;

        revalidatePath('/scores');
        revalidatePath('/');

        return { success: true };
    } catch (error) {
        console.error('Error deleting money event:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete money event'
        };
    }
}

/**
 * Auto-detect and create money events based on scores
 * Call this after a score is submitted
 */
export async function autoDetectMoneyEvents(
    roundId: string,
    playerId: string,
    holeId: string,
    strokes: number,
    totalParticipants: number
) {
    try {
        // Get hole par
        const hole = await prisma.hole.findUnique({
            where: { id: holeId },
            select: { par: true, holeNumber: true }
        });

        if (!hole) {
            return { success: false, error: 'Hole not found' };
        }

        const scoreDiff = strokes - hole.par;

        // Determine event type and amount
        let eventType: string | null = null;
        let amount = 0;

        if (scoreDiff === -3) {
            eventType = 'albatross';
            amount = 5 * (totalParticipants - 1); // $5 per person for albatross
        } else if (scoreDiff === -2) {
            eventType = 'eagle';
            amount = 2 * (totalParticipants - 1); // $2 per person for eagle
        } else if (scoreDiff === -1) {
            eventType = 'birdie';
            amount = 1 * (totalParticipants - 1); // $1 per person for birdie
        }

        // Create money event if applicable
        if (eventType && amount > 0) {
            await createMoneyEvent({
                roundId,
                playerId,
                holeNumber: hole.holeNumber,
                eventType: eventType as any,
                amount
            });

            return {
                success: true,
                data: { eventType, amount, holeNumber: hole.holeNumber }
            };
        }

        return { success: true, data: null }; // No money event
    } catch (error) {
        console.error('Error auto-detecting money events:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to detect money events'
        };
    }
}
