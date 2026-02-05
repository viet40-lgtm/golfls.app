'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

/**
 * Creates a new live round in the LiveRound table
 */
export async function createLiveRound(data: {
    name: string;
    date: string;
    courseId: string;
    courseName: string;
    par: number;
    rating: number;
    slope: number;
}) {
    console.log('SERVER ACTION: createLiveRound starting...', data.name);
    try {
        const session = await getSession();

        const liveRound = await prisma.liveRound.create({
            data: {
                name: data.name,
                // shortId: shortId, // DISABLED: Schema mismatch in prod
                date: data.date,
                course: { connect: { id: data.courseId } },
                courseName: data.courseName,
                par: data.par,
                rating: data.rating,
                slope: data.slope
            }
        });
        console.log('SERVER ACTION: createLiveRound SUCCESS:', liveRound.id);
        revalidatePath('/');
        return { success: true, liveRoundId: liveRound.id };
    } catch (error) {
        console.error('SERVER ACTION: createLiveRound FAILED:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create live round'
        };
    }
}

/**
 * Creates a new live round with default settings (City Park North)
 * Used by the "New Round" button in the UI
 */
export async function createDefaultLiveRound(date: string, creatorName?: string, suffix?: string) {
    try {
        // Get default course (City Park North)
        let defaultCourse = await prisma.course.findFirst({
            where: { name: { contains: 'City Park North', mode: 'insensitive' } },
            include: { teeBoxes: true, holes: true }
        });

        if (!defaultCourse) {
            defaultCourse = await prisma.course.findFirst({
                include: { teeBoxes: true, holes: true }
            });
        }

        if (!defaultCourse) {
            throw new Error('No course found');
        }

        // Find White tee box or fallback to first available
        const whiteTee = defaultCourse.teeBoxes.find(t => t.name.toLowerCase().includes('white'));
        const defaultTeeBox = whiteTee || defaultCourse.teeBoxes[0];

        // Check for logged-in user
        const session = await getSession();

        let roundName = `Live Round - ${date}`;
        let playerToAdd = null;

        if (session && session.email) {
            // Use logged-in user's name if not provided
            const effectiveCreatorName = creatorName || session.name || session.email.split('@')[0];

            if (suffix) {
                roundName = `${effectiveCreatorName} ${suffix}`;
            } else {
                roundName = `${effectiveCreatorName} - ${date}`;
            }

            // Find player details (id and preferred tee box)
            const player = await prisma.player.findUnique({
                where: { email: session.email },
                select: { id: true, preferredTeeBox: true }
            });

            if (player) {
                playerToAdd = player;
            }
        } else {
            // Fallback naming logic if no session
            if (creatorName && suffix) {
                roundName = `${creatorName} ${suffix}`;
            } else if (creatorName) {
                roundName = `${creatorName} - ${date}`;
            } else if (suffix) {
                roundName += ` (${suffix})`;
            }
        }

        const newRound = await prisma.liveRound.create({
            data: {
                name: roundName,
                // shortId: shortId, // DISABLED: Schema mismatch
                date: date,
                courseId: defaultCourse.id,
                courseName: defaultCourse.name,
                par: defaultCourse.holes.reduce((sum, h) => sum + h.par, 0),
                rating: defaultTeeBox.rating,
                slope: defaultTeeBox.slope
            }
        });

        // Add creator as first player if found
        if (playerToAdd) {
            let selectedTeeBoxId = defaultTeeBox.id;

            // Try to match preferred tee box
            if (playerToAdd.preferredTeeBox) {
                const preferred = defaultCourse.teeBoxes.find(t =>
                    t.name.toLowerCase() === playerToAdd.preferredTeeBox?.toLowerCase()
                );
                if (preferred) {
                    selectedTeeBoxId = preferred.id;
                }
            }

            await addPlayerToLiveRound({
                liveRoundId: newRound.id,
                playerId: playerToAdd.id,
                teeBoxId: selectedTeeBoxId
            });
        }

        revalidatePath('/');
        return { success: true, roundId: newRound.id };
    } catch (error) {
        console.error('Error creating live round:', error);
        return { success: false, error: 'Failed to create round' };
    }
}

/**
 * Updates an existing live round metadata
 */
export async function updateLiveRound(data: {
    id: string;
    name: string;
    date: string;
    courseId?: string;
    par: number;
    rating: number;
    slope: number;
}) {
    try {
        const liveRound = await prisma.liveRound.update({
            where: { id: data.id },
            data: {
                name: data.name,
                date: data.date,
                course: { connect: { id: data.courseId } },
                par: data.par,
                rating: data.rating,
                slope: data.slope
            },
            include: {
                players: true
            }
        });

        // Update all players in this round to match the new course data for accurate handicap/net calculation
        // They keep their own handicap indexes, but recalculate course handicap based on new slope/rating/par
        for (const player of liveRound.players) {
            // Note: Since we don't store indexAtTime in the generic way on update yet (unless we fetch it),
            // and we don't store teeBoxRating/Slope on player anymore, 
            // we really should fetch the tee box to recalc accurately if the course changed.
            // But for now, we'll try to use the stored indexAtTime if available.

            const index = player.indexAtTime || 0;
            const courseHandicap = Math.round((index * (data.slope / 113)) + (data.rating - data.par));

            await prisma.liveRoundPlayer.update({
                where: { id: player.id },
                data: {
                    courseHandicap: courseHandicap
                }
            });
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update live round'
        };
    }
}

/**
 * Adds a player to a live round
 */
export async function addPlayerToLiveRound(data: {
    liveRoundId: string;
    playerId: string;
    teeBoxId: string;
    scorerId?: string;
}) {
    console.log('SERVER ACTION: addPlayerToLiveRound starting...', data.playerId, 'to', data.liveRoundId);
    try {
        // Get player and tee box data
        const player = await prisma.player.findUnique({
            where: { id: data.playerId }
        });

        const teeBox = await prisma.teeBox.findUnique({
            where: { id: data.teeBoxId },
            include: {
                course: {
                    include: {
                        holes: true
                    }
                }
            }
        });

        if (!player || !teeBox) {
            throw new Error('Player or tee box not found');
        }

        // Calculate course handicap
        const handicapIndex = player.handicapIndex || 0;
        const par = teeBox.course.holes.reduce((sum, h) => sum + h.par, 0);

        // Check if player already exists in round to prevent duplicates
        const existing = await prisma.liveRoundPlayer.findFirst({
            where: {
                liveRoundId: data.liveRoundId,
                playerId: data.playerId
            }
        });

        if (existing) {
            // If exists, just update scorerId
            await prisma.liveRoundPlayer.update({
                where: { id: existing.id },
                data: {
                    scorerId: data.scorerId
                }
            });
            revalidatePath('/');
            return { success: true, liveRoundPlayerId: existing.id };
        }

        // Create live round player
        // Create live round player
        const liveRoundPlayer = await prisma.liveRoundPlayer.create({
            data: {
                liveRoundId: data.liveRoundId,
                playerId: data.playerId,
                teeBoxId: data.teeBoxId,
                indexAtTime: handicapIndex, // Snapshot
                teeBoxName: teeBox.name, // Snapshot
                courseHandicap: Math.round((handicapIndex * (teeBox.slope / 113)) + (teeBox.rating - par)),
                scorerId: data.scorerId
            }
        });

        console.log('SERVER ACTION: addPlayerToLiveRound SUCCESS:', liveRoundPlayer.id);
        revalidatePath('/');
        return { success: true, liveRoundPlayerId: liveRoundPlayer.id };
    } catch (error) {
        console.error('SERVER ACTION: addPlayerToLiveRound FAILED:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add player'
        };
    }
}

/**
 * Updates the scorerId for a player (Claim/Takeover)
 */
export async function updatePlayerScorer(data: {
    liveRoundPlayerId: string;
    scorerId: string;
}) {
    try {
        await prisma.liveRoundPlayer.update({
            where: { id: data.liveRoundPlayerId },
            data: {
                scorerId: data.scorerId
            }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update player scorer:', error);
        return { success: false, error: 'Failed to update scorer' };
    }
}

/**
 * Adds a guest player to a live round
 */
export async function addGuestToLiveRound(data: {
    liveRoundId: string;
    guestName: string;
    index: number;
    courseHandicap: number;
    rating: number;
    slope: number;
    par: number;
    scorerId?: string;
}) {
    try {
        // We typically need a teeBoxId. If 'Guest' tee doesn't exist, we might need a workaround.
        // For now, let's assume we find a tee box that matches the rating/slope OR use the first one of the course.
        // This is a bit tricky since guests might play arbitrary settings.
        // But the schema REQUIRES teeBoxId.

        // Find the course from the live round
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: data.liveRoundId },
            include: { course: { include: { teeBoxes: true } } }
        });

        if (!liveRound) throw new Error("Live Round not found");

        // Try to find a matching tee box or use the first one
        // Note: guests "custom" tees might not match exactly. Just pick the first one as a placeholder reference.
        // The display logic often uses the passed values anyway.
        const fallbackTeeBox = liveRound.course.teeBoxes[0];

        if (!fallbackTeeBox) throw new Error("No tee boxes found for course");

        // Create guest player in live round
        const guestPlayer = await prisma.liveRoundPlayer.create({
            data: {
                liveRoundId: data.liveRoundId,
                isGuest: true,
                guestName: data.guestName,
                teeBoxId: fallbackTeeBox.id,
                teeBoxName: fallbackTeeBox.name || 'Guest',
                indexAtTime: data.index,
                courseHandicap: data.courseHandicap,
                scorerId: data.scorerId
            }
        });

        revalidatePath('/');
        return { success: true, guestPlayerId: guestPlayer.id };
    } catch (error) {
        console.error('Failed to add guest to live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add guest'
        };
    }
}

/**
 * Updates a guest player in a live round
 */
export async function updateGuestInLiveRound(data: {
    guestPlayerId: string;
    guestName: string;
    index: number;
    courseHandicap: number;
}) {
    try {
        await prisma.liveRoundPlayer.update({
            where: { id: data.guestPlayerId },
            data: {
                guestName: data.guestName,
                indexAtTime: data.index,
                courseHandicap: data.courseHandicap
            }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update guest:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update guest'
        };
    }
}

/**
 * Deletes a guest player from a live round
 */
export async function deleteGuestFromLiveRound(guestPlayerId: string) {
    try {
        await prisma.liveRoundPlayer.delete({
            where: { id: guestPlayerId }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete guest:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete guest'
        };
    }
}

/**
 * Saves a score for a specific hole in a live round
 */
export async function saveLiveScore(data: {
    liveRoundId: string;
    holeNumber: number;
    playerScores: Array<{ playerId: string; strokes: number }>;
    scorerId?: string;
}) {
    const results: Array<{ playerId: string, success: boolean, error?: string }> = [];
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();

    try {
        console.log(`SERVER ACTION: saveLiveScore - Round: ${data.liveRoundId}, Hole: ${data.holeNumber}, Scorer: ${data.scorerId}`);
        console.log(`Scores to save: ${JSON.stringify(data.playerScores)}`);

        // Get the live round with course and holes
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: data.liveRoundId },
            include: {
                course: {
                    include: {
                        holes: true
                    }
                }
            }
        });

        if (!liveRound) {
            throw new Error('Live round not found');
        }

        const hole = liveRound.course.holes.find(h => h.holeNumber === data.holeNumber);
        if (!hole) {
            throw new Error(`Hole ${data.holeNumber} not found`);
        }

        // Save scores for each player
        for (const ps of data.playerScores) {
            try {
                // Find the live round player (could be by player_id OR direct LiveRoundPlayer id for guests)
                const liveRoundPlayer = await prisma.liveRoundPlayer.findFirst({
                    where: {
                        liveRoundId: data.liveRoundId,
                        OR: [
                            { playerId: ps.playerId },
                            { id: ps.playerId }
                        ]
                    }
                });

                if (!liveRoundPlayer) {
                    console.warn(`Player ${ps.playerId} not found in live round`);
                    results.push({ playerId: ps.playerId, success: false, error: 'Player not found' });
                    continue;
                }

                // ENFORCE OWNERSHIP - REMOVED per user request
                // Any device can now score for any player.
                // We leave the scorerId field in the DB for now to avoid schema breaks, 
                // but we ignore it for permission checks.

                // Save or update the score
                const existingScore = await prisma.liveScore.findFirst({
                    where: {
                        liveRoundPlayerId: liveRoundPlayer.id,
                        holeId: hole.id
                    }
                });

                if (existingScore) {
                    await prisma.liveScore.update({
                        where: { id: existingScore.id },
                        data: { strokes: ps.strokes }
                    });
                } else {
                    await prisma.liveScore.create({
                        data: {
                            liveRoundPlayerId: liveRoundPlayer.id,
                            holeId: hole.id,
                            strokes: ps.strokes
                        }
                    });
                }
                console.log(`Saved score for player ${liveRoundPlayer.guestName || liveRoundPlayer.playerId}: ${ps.strokes}`);

                // Recalculate totals
                const allScores = await prisma.liveScore.findMany({
                    where: { liveRoundPlayerId: liveRoundPlayer.id },
                    include: { hole: { select: { holeNumber: true } } }
                });

                let gross = 0;
                let front = 0;
                let back = 0;

                allScores.forEach(s => {
                    gross += s.strokes;
                    if (s.hole.holeNumber <= 9) front += s.strokes;
                    else back += s.strokes;
                });

                await prisma.liveRoundPlayer.update({
                    where: { id: liveRoundPlayer.id },
                    data: {
                        grossScore: gross,
                        frontNine: front > 0 ? front : null,
                        backNine: back > 0 ? back : null
                    }
                });

                results.push({ playerId: ps.playerId, success: true });
            } catch (err) {
                console.error(`Failed to save score for player ${ps.playerId}:`, err);
                results.push({
                    playerId: ps.playerId,
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        revalidatePath('/');
        revalidatePath('/live');

        // Return overall status
        const anyFailed = results.some(r => !r.success);
        if (anyFailed) {
            const failedNames = results.filter(r => !r.success).map(r => r.playerId).join(', ');
            return {
                success: true,
                partialFailure: true,
                results,
                error: `Some scores could not be saved (locked or error).`
            };
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to save live score batch:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save score'
        };
    }
}

/**
 * Deletes a live round
 */
export async function deleteLiveRound(liveRoundId: string) {
    try {
        await prisma.liveRound.delete({
            where: { id: liveRoundId }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete round'
        };
    }
}

/**
 * Gets all live rounds for selection dropdown
 */
export async function getAllLiveRounds() {
    try {
        const rounds = await prisma.liveRound.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                date: true,
                createdAt: true
            }
        });

        return { success: true, rounds };
    } catch (error) {
        console.error('Failed to get live rounds:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get rounds',
            rounds: []
        };
    }
}
