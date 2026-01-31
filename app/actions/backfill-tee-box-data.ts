'use server';

/**
 * This action is not supported in the current schema as RoundPlayer does not store
 * tee box snapshots (par, rating, slope).
 */
export async function backfillTeeBoxData() {
    return {
        success: false,
        message: 'This action is not supported for this version of the application.'
    };
}
