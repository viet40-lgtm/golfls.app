'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Creates a new live round in the LiveRound table (completely isolated from main rounds)
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
    try {
        // ENFORCE ONE ROUND AT A TIME RULE:
        const latestRounds = await prisma.liveRound.findMany({
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 5,
            include: {
                players: {
                    include: {
                        scores: true
                    }
                }
            }
        });

        for (const round of latestRounds) {
            if (round.players.length > 0) {
                const anyIncomplete = round.players.some(p => p.scores.length < 18);
                if (anyIncomplete) {
                    return {
                        success: false,
                        error: `Cannot create new round. Round "${round.name}" is still in progress (not all players have 18 scores).`
                    };
                }
            }
        }

        const liveRound = await prisma.liveRound.create({
            data: {
                name: data.name,
                date: data.date,
                courseId: data.courseId,
                courseName: data.courseName,
                par: data.par,
                rating: data.rating,
                slope: data.slope
            }
        });

        // revalidatePath('/live'); // Removing to prevent client-side state loss during modal save
        return { success: true, liveRoundId: liveRound.id };
    } catch (error) {
        console.error('Failed to create live round:', error);
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
export async function createDefaultLiveRound(date: string) {
    try {
        // ENFORCE ONE ROUND AT A TIME RULE:
        // Check for any existing live rounds that are incomplete
        const latestRounds = await prisma.liveRound.findMany({
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 5,
            include: {
                players: {
                    include: {
                        scores: true
                    }
                }
            }
        });

        for (const round of latestRounds) {
            // A round is considered incomplete if it has players and at least one player is not "thru" 18 holes
            if (round.players.length > 0) {
                const anyIncomplete = round.players.some(p => p.scores.length < 18);
                if (anyIncomplete) {
                    return {
                        success: false,
                        error: `Cannot create new round. Round "${round.name}" is still in progress (not all players have 18 scores).`
                    };
                }
            }
        }

        // Get default course (City Park North)
        let defaultCourse = await prisma.course.findFirst({
            where: { name: { contains: 'City Park North', mode: 'insensitive' } },
            include: { teeBoxes: true, holes: { orderBy: { holeNumber: 'asc' } } }
        });

        if (!defaultCourse) {
            defaultCourse = await prisma.course.findFirst({
                include: { teeBoxes: true, holes: { orderBy: { holeNumber: 'asc' } } }
            });
        }

        if (!defaultCourse) {
            throw new Error('No course found');
        }

        const coursePar = (defaultCourse as any).holes.reduce((sum: number, h: any) => sum + h.par, 0);

        // Find White tee box or fallback to first available
        const whiteTee = (defaultCourse as any).teeBoxes.find((t: any) => t.name.toLowerCase().includes('white'));
        const defaultTeeBox = whiteTee || (defaultCourse as any).teeBoxes[0];

        const roundName = defaultCourse.name;

        const newRound = await prisma.liveRound.create({
            data: {
                name: roundName,
                date: date,
                courseId: defaultCourse.id,
                courseName: defaultCourse.name,
                par: coursePar,
                rating: defaultTeeBox?.rating ?? coursePar,
                slope: defaultTeeBox?.slope ?? 113
            }
        });

        revalidatePath('/live');
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
                courseId: data.courseId,
                par: data.par,
                rating: data.rating,
                slope: data.slope
            },
            include: {
                players: true
            }
        });

        // Fetch player profiles and course tee boxes to respect preferences during recalculation
        const playerIds = liveRound.players.filter((p: any) => !p.isGuest && p.playerId).map((p: any) => p.playerId);
        const playerProfiles = await prisma.player.findMany({
            where: { id: { in: playerIds } },
            select: { id: true, preferredTeeBox: true }
        });
        const profileMap = new Map(playerProfiles.map(p => [p.id, p]));

        const course = await prisma.course.findUnique({
            where: { id: data.courseId || liveRound.courseId },
            include: { teeBoxes: true }
        });

        for (const player of liveRound.players) {
            let pRating = data.rating;
            let pSlope = data.slope;
            let pTeeName = player.teeBoxName;
            let pTeeId = player.teeBoxId;

            const profile = player.playerId ? profileMap.get(player.playerId) : null;
            if (profile?.preferredTeeBox && course) {
                const prefTee = (course as any).teeBoxes.find((t: any) =>
                    t.name.toLowerCase().includes(profile.preferredTeeBox!.toLowerCase())
                );
                if (prefTee) {
                    pRating = prefTee.rating;
                    pSlope = prefTee.slope;
                    pTeeName = prefTee.name;
                    pTeeId = prefTee.id;
                }
            }

            const courseHandicap = Math.round((player.indexAtTime * (pSlope / 113)) + (pRating - data.par));
            await prisma.liveRoundPlayer.update({
                where: { id: player.id },
                data: {
                    teeBoxId: pTeeId,
                    teeBoxName: pTeeName,
                    teeBoxRating: pRating,
                    teeBoxSlope: pSlope,
                    teeBoxPar: data.par,
                    courseHandicap: courseHandicap,
                    indexAtTime: player.indexAtTime // Ensure indexAtTime is preserved or updated if needed
                }
            });
        }

        // revalidatePath('/live');
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
                data: { scorerId: data.scorerId }
            });
            revalidatePath('/live');
            return { success: true, liveRoundPlayerId: existing.id };
        }

        // Create live round player
        const liveRoundPlayer = await prisma.liveRoundPlayer.create({
            data: {
                liveRoundId: data.liveRoundId,
                playerId: data.playerId,
                teeBoxId: data.teeBoxId,
                teeBoxName: teeBox.name,
                teeBoxRating: teeBox.rating,
                teeBoxSlope: Math.round(teeBox.slope),
                teeBoxPar: par,
                indexAtTime: handicapIndex,
                courseHandicap: Math.round((handicapIndex * (teeBox.slope / 113)) + (teeBox.rating - par)),
                scorerId: data.scorerId,
                inPool: false // Explicitly enforce opt-in only
            }
        });

        revalidatePath('/live');
        return { success: true, liveRoundPlayerId: liveRoundPlayer.id };
    } catch (error) {
        console.error('Failed to add player to live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add player'
        };
    }
}

/**
 * Toggles a player's participation in the pool (FBT Game)
 */
export async function toggleLivePoolParticipation(data: {
    liveRoundId: string;
    playerId: string;
}) {
    try {
        // Find player by either playerId (regular) or id (guest)
        const liveRoundPlayer = await prisma.liveRoundPlayer.findFirst({
            where: {
                liveRoundId: data.liveRoundId,
                OR: [
                    { playerId: data.playerId },
                    { id: data.playerId }
                ]
            }
        });

        if (!liveRoundPlayer) {
            throw new Error('Player not found in this round');
        }

        await prisma.liveRoundPlayer.update({
            where: { id: liveRoundPlayer.id },
            data: { inPool: !liveRoundPlayer.inPool }
        });

        revalidatePath('/live');
        return { success: true, inPool: !liveRoundPlayer.inPool };
    } catch (error) {
        console.error('Failed to toggle pool participation:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle pool'
        };
    }
}

/**
 * Updates the scorer_id for a player (Claim/Takeover)
 */
export async function updatePlayerScorer(data: {
    liveRoundPlayerId: string;
    scorerId: string;
}) {
    try {
        await prisma.liveRoundPlayer.update({
            where: { id: data.liveRoundPlayerId },
            data: { scorerId: data.scorerId }
        });
        revalidatePath('/live');
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
        // Create guest player in live round
        const guestPlayer = await (prisma.liveRoundPlayer as any).create({
            data: {
                liveRoundId: data.liveRoundId,
                isGuest: true,
                guestName: data.guestName,
                teeBoxName: 'Guest',
                teeBoxRating: data.rating,
                teeBoxSlope: data.slope,
                teeBoxPar: data.par,
                indexAtTime: data.index,
                courseHandicap: data.courseHandicap,
                scorerId: data.scorerId,
                inPool: false // Explicitly enforce opt-in only
            }
        });

        revalidatePath('/live');
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

        revalidatePath('/live');
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

        revalidatePath('/live');
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
    try {
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

        // Check if user is admin
        const cookieStore = await cookies();
        const isAdmin = cookieStore.get('admin_session')?.value === 'true';

        // Save scores for each player
        for (const ps of data.playerScores) {
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
                continue;
            }

            // ENFORCE OWNERSHIP -> RELAXED TO "LAST WRITER WINS"
            // If scorer_id is different, we "steal" ownership and update it.
            // This works in tandem with the Client-Side "Auto-Unselect" to resolve conflicts.
            if (liveRoundPlayer.scorerId !== data.scorerId) {
                await prisma.liveRoundPlayer.update({
                    where: { id: liveRoundPlayer.id },
                    data: { scorerId: data.scorerId }
                });
            }

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
                if (s.hole?.holeNumber && s.hole.holeNumber <= 9) front += s.strokes;
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
        }

        revalidatePath('/live');
        return { success: true };
    } catch (error) {
        console.error('Failed to save live score:', error);
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

        revalidatePath('/live');
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
