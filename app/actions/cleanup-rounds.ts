'use server'

export async function cleanupIncompleteRounds(todayStr: string) {
    console.log("DIAG: cleanupIncompleteRounds", todayStr);
    return { success: true, count: 0 };
}
