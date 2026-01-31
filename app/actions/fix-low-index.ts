'use server';

/**
 * Emergency fix: Reset all low_handicap_index values to null
 * NOTE: The current schema does not have 'low_handicap_index' or 'lowHandicapIndex' on Player.
 * This action is currently a placeholder until schema is updated.
 */
export async function resetLowHandicapIndexes() {
    console.log('resetLowHandicapIndexes called - No-op due to schema differences');
    return {
        success: true,
        message: 'No actions taken (schema does not support low handicap index).'
    };
}
