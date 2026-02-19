'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';
import { revalidatePath } from 'next/cache';

export async function recalculateAllHandicaps() {
    try {
        console.log('🚀 Starting Full Handicap Recalculation...');

        // 0. Fix Round Completion Status & Tee Box Assignments
        console.log('🔧 Fixing round completion status & tee box assignments...');

        // Auto-complete non-live rounds that are marked incomplete (Fix for older data/posted scores)
        await (prisma.round as any).updateMany({
            where: {
                isLive: false,
                completed: false
            },
            data: { completed: true }
        });

        // B. SAFETY: Un-complete any round with suspiciously low scores (likely partial live rounds marked complete)
        // A score < 25 is practically impossible for 9/18 holes. This catches "1 hole scored" partials.

        // We need to find RoundPlayers that are linked to COMPLETED, NON-LIVE rounds but have partial scores
        const partialRoundPlayers = await (prisma.roundPlayer as any).findMany({
            where: {
                grossScore: { lt: 60, not: null }, // Catch partial rounds (Score < 60 is suspicious for amateur 18 holes)
                round: {
                    completed: true,
                    isLive: { not: true }  // ⚠️ CRITICAL: Exclude live rounds from this check (includes null)
                }
            },
            select: { roundId: true }
        });

        if (partialRoundPlayers.length > 0) {
            console.log(`⚠️ Found ${partialRoundPlayers.length} partial rounds marked complete. Fixing...`);
            const uniqueRoundIds = [...new Set(partialRoundPlayers.map(r => r.roundId))];
            await (prisma.round as any).updateMany({
                where: { id: { in: uniqueRoundIds } },
                data: { completed: false }
            });
            console.log(`✅ Reset ${uniqueRoundIds.length} rounds to Incomplete.`);
        }

        console.log('✅ Integrity checks passed.');

        // 1. Fetch all players
        const players = await (prisma.player as any).findMany({
            include: {
                rounds: {
                    include: { round: true, teeBox: true }
                },
                manualRounds: true
            }
        });

        let updatedCount = 0;

        for (const player of players) {
            try {
                // 2. Combine and Sort All Rounds Chronologically
                type HistoryItem =
                    | { type: 'v3'; date: string; id: string; score: number; rating: number; slope: number; timestamp: number }
                    | { type: 'v2'; date: string; id: string; differential: number; timestamp: number };

                const v3Rounds: HistoryItem[] = player.rounds
                    .filter((r: any) => r.teeBox && r.round.completed === true && r.round.isLive !== true) // ⚠️ CRITICAL: Only completed, NON-LIVE rounds (includes null)
                    .map((r: any) => ({
                        type: 'v3',
                        date: r.round.date,
                        id: r.id,
                        score: r.adjustedGrossScore || r.grossScore || 0,
                        // PRIORITY: Use saved tee box data, fallback to current tee box relationship
                        rating: r.teeBoxRating ?? r.teeBox!.rating,
                        slope: r.teeBoxSlope ?? r.teeBox!.slope,
                        timestamp: new Date(r.round.date).getTime()
                    }));

                const v2Rounds: HistoryItem[] = (player as any).manualRounds.map((r: any) => ({
                    date: r.datePlayed,
                    id: r.id,
                    differential: r.scoreDifferential,
                    timestamp: new Date(r.datePlayed).getTime()
                }));

                // Combine and sort all rounds chronologically
                const allHistory: HistoryItem[] = [...v3Rounds, ...v2Rounds].sort((a, b) => a.timestamp - b.timestamp);

                // 3. Replay History with Dynamic Low Handicap Index
                // For true accuracy, we must calculate the Low HI *at that specific moment in time*
                // for every single round.

                let currentHistory: HandicapInput[] = [];
                // We also need to store the raw history with calculated indices to look back on
                let historyWithIndices: { date: string; indexAfter: number }[] = [];

                let finalLowHandicapIndex: number | null = null;
                const now = new Date();
                const twelveMonthsAgoFromNow = new Date();
                twelveMonthsAgoFromNow.setFullYear(now.getFullYear() - 1);

                for (const round of allHistory) {
                    const roundDate = new Date(round.date);

                    // 3a. Calculate Dynamic Low Index for THIS round
                    // Look back 12 months from THIS round's date
                    const oneYearPrior = new Date(roundDate);
                    oneYearPrior.setFullYear(oneYearPrior.getFullYear() - 1);

                    let dynamicLowIndex: number | null = null;

                    // Find lowest index in the window [oneYearPrior, roundDate]
                    // Only consider indices that were established with at least 3 rounds
                    // We use historyWithIndices which matches currentHistory 1-to-1
                    for (let i = 0; i < historyWithIndices.length; i++) {
                        // Check if this historical round is within the 12-month window of the CURRENT round
                        const pastRoundDate = new Date(historyWithIndices[i].date);
                        if (pastRoundDate >= oneYearPrior && pastRoundDate < roundDate) {
                            // Check if at that time, we had enough history (index i corresponds to having i+1 rounds)
                            if ((i + 1) >= 20) {
                                const val = historyWithIndices[i].indexAfter;
                                if (dynamicLowIndex === null || val < dynamicLowIndex) {
                                    dynamicLowIndex = val;
                                }
                            }
                        }
                    }

                    // A. Calculate Index BEFORE this round (using dynamic Low Index)
                    const statsBefore = calculateHandicap(convertToHandicapInput(currentHistory), dynamicLowIndex);
                    const indexBefore = statsBefore.handicapIndex;

                    // B. Add this round to history
                    if (round.type === 'v3') {
                        currentHistory.push({
                            id: round.id,
                            date: round.date,
                            score: round.score,
                            rating: round.rating,
                            slope: round.slope
                        } as HandicapInput);
                    } else {
                        currentHistory.push({
                            id: round.id,
                            date: round.date,
                            differential: round.differential
                        } as HandicapInput);
                    }

                    // C. Calculate Index AFTER this round (using dynamic Low Index)
                    const statsAfter = calculateHandicap(convertToHandicapInput(currentHistory), dynamicLowIndex);
                    const indexAfter = statsAfter.handicapIndex;

                    // Add to our lookback history
                    historyWithIndices.push({
                        date: round.date,
                        indexAfter: indexAfter
                    });

                    // D. Update DB if it's a V3 round
                    if (round.type === 'v3') {
                        await (prisma as any).roundPlayer.update({
                            where: { id: round.id },
                            data: {
                                indexAtTime: indexBefore,
                                indexAfter: indexAfter
                            } as any
                        });
                        updatedCount++;
                    }
                }

                // 4. Calculate Final Low Index for the Player (for today)
                // This is what gets stored in the player record
                for (let i = 0; i < historyWithIndices.length; i++) {
                    const pastRoundDate = new Date(historyWithIndices[i].date);
                    if (pastRoundDate >= twelveMonthsAgoFromNow) {
                        if ((i + 1) >= 20) {
                            const val = historyWithIndices[i].indexAfter;
                            if (finalLowHandicapIndex === null || val < finalLowHandicapIndex) {
                                finalLowHandicapIndex = val;
                            }
                        }
                    }
                }

                // 5. Update Final Player Index AND Final Low Handicap Index
                const finalStats = calculateHandicap(convertToHandicapInput(currentHistory), finalLowHandicapIndex);
                await (prisma.player as any).update({
                    where: { id: player.id },
                    data: {
                        handicapIndex: finalStats.handicapIndex,
                        lowHandicapIndex: finalLowHandicapIndex
                    }
                });
            } catch (error) {
                console.error(`failed to process player ${player.name}:`, error);
            }
        }

        console.log(`✅ Recalculation Complete. Updated ${updatedCount} rounds.`);

        revalidatePath('/scores');
        revalidatePath('/players');
        return { success: true, message: `Successfully recalculated handicaps for ${players.length} players.` };

    } catch (error) {
        console.error('Recalculation failed:', error);
        return { success: false, message: 'Failed to recalculate handicaps.' };
    }
}

// Helper
function convertToHandicapInput(history: any[]): HandicapInput[] {
    return history.map(h => {
        if (h.differential !== undefined) {
            return { id: h.id, date: h.date, differential: h.differential } as HandicapInput;
        } else {
            return { id: h.id, date: h.date, score: h.score, rating: h.rating, slope: h.slope } as HandicapInput;
        }
    });
}
