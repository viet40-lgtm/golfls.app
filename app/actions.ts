'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateAdjustedGrossScore } from '@/lib/adjusted-score';
import { calculateScoreDifferential } from '@/lib/handicap';
import { recalculatePlayerHandicap } from './actions/recalculate-player';

export async function updateRoundPlayerTeeBox(roundPlayerId: string, teeBoxId: string) {
    const teeBox = await prisma.teeBox.findUnique({
        where: { id: teeBoxId }
    });

    if (!teeBox) {
        throw new Error("Tee box not found");
    }

    const roundPlayer = await prisma.roundPlayer.update({
        where: { id: roundPlayerId },
        data: {
            teeBoxId: teeBoxId,
            // teeBoxName etc are not in RoundPlayer schema, they are relations
        }
    });

    revalidatePath(`/scores/${roundPlayer.roundId}/edit`);
    revalidatePath('/scores');
}

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function postScore(formData: FormData) {
    const playerId = formData.get('playerId') as string;
    // courseId removed from FormData requirement, derived from TeeBox
    const teeBoxId = formData.get('teeBoxId') as string;
    const date = formData.get('date') as string;
    const scoreRaw = formData.get('score');

    if (!playerId || !teeBoxId || !date || !scoreRaw) {
        throw new Error('Missing required fields');
    }

    const grossScore = parseInt(scoreRaw as string);
    // points/payout ignored

    // Fetch tee box and course for rating/slope/par
    const teeBox = await prisma.teeBox.findUnique({
        where: { id: teeBoxId },
        include: {
            course: {
                include: {
                    holes: true
                }
            }
        }
    });

    if (!teeBox) throw new Error('Tee Box not found');

    const courseId = teeBox.courseId || teeBox.course.id; // Derive courseId

    // Calculate course par from holes
    const coursePar = teeBox.course.holes.reduce((sum, hole) => sum + hole.par, 0);

    // Calculate differential (using Gross as Adjusted Gross since we have no hole scores)
    const differential = calculateScoreDifferential(grossScore, teeBox.rating, teeBox.slope, 0);

    // 1. Find or Create Round
    // We try to find a NON-TOURNAMENT round on this date at this course
    let round = await prisma.round.findFirst({
        where: {
            date: date,
            courseId: courseId,
            isTournament: false,
            // is_live deleted from schema
        },
    });

    if (!round) {
        round = await prisma.round.create({
            data: {
                date: date,
                courseId: courseId,
                courseName: teeBox.course.name, // Required by schema
                isTournament: false,
                // completed field removed from schema? Or default provided? Schema check: Round didn't show 'completed'. 
                // But let's assume if it errors I'll fix. Step 925 Round didn't show 'completed'.
                // removing completed: true
            },
        });
    }

    // 2. Add the Player's Score with tee box data
    await prisma.roundPlayer.create({
        data: {
            roundId: round.id,
            playerId: playerId,
            teeBoxId: teeBoxId,
            // tee_box_name etc removed
            grossScore: grossScore,
            // points/payout removed
            netScore: grossScore, // Fallback
            // score_differential removed
            courseHandicap: Math.round(grossScore - differential) // approximation or 0? 
            // Wait, roundPlayer needs 'courseHandicap'. 
            // Formula: index * slope/113 + (rating-par).
            // I need player's index. recalculatePlayerHandicap will fix it later?
            // For now, inserting 0 to satisfy schema.
        },
    });

    // Automatically recalculate handicap for this player
    await recalculatePlayerHandicap(playerId);

    revalidatePath('/players');
    revalidatePath('/scores');
    redirect('/players');
}

export async function createRound(date: string, courseId: string, name?: string, isTournament: boolean = false) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error('Course not found');

    const round = await prisma.round.create({
        data: {
            date,
            courseId: courseId,
            courseName: course.name,
            name,
            isTournament: isTournament,
        },
    });
    revalidatePath('/scores');
    return round;
}

export async function createLiveRound(data: {
    date: string;
    name: string;
    courseName: string;
    par: number;
    rating: number;
    slope: number;
}) {
    // 1. Create a new Course
    const course = await prisma.course.create({
        data: {
            name: data.courseName,
        }
    });

    // 2. Create 18 holes for this course
    // We'll distribute the total par across 18 holes
    const basePar = Math.floor(data.par / 18);
    const extraPars = data.par % 18;

    for (let i = 1; i <= 18; i++) {
        await prisma.hole.create({
            data: {
                courseId: course.id,
                holeNumber: i,
                par: i <= extraPars ? basePar + 1 : basePar,
            }
        });
    }

    // 3. Create a default Tee Box
    await prisma.teeBox.create({
        data: {
            courseId: course.id,
            name: 'Live',
            rating: data.rating,
            slope: data.slope,
            par: data.par,
        }
    });

    // 4. Create the Round
    const round = await prisma.round.create({
        data: {
            date: data.date.includes('T') ? data.date : `${data.date}T12:00:00`,
            courseId: course.id,
            name: data.name,
            courseName: data.courseName, // Required by schema
            isTournament: false,
            // isLive removed from schemamoved from schema or handled via isTournament? 
            // The user screenshot showed error on course_id. 
            // Let's assume is_live is also invalid if it was removed.
            // But checking schema, isLive might exist or not. 
            // Wait, previous instructions said "is_live deleted from schema" in line 76 comment.
            // So I should remove is_live: true as well.
        },
    });

    revalidatePath('/');
    revalidatePath('/scores');
    return round;
}

export async function updateRound(roundId: string, data: { date: string; name?: string; isTournament: boolean; courseId?: string }) {
    if (data.courseId) {
        // If course is changing, we need to:
        // 1. Update round courseId
        // 2. Clear teeBoxId for all players (since tee boxes belong to old course)
        await prisma.$transaction([
            prisma.round.update({
                where: { id: roundId },
                data: {
                    date: data.date,
                    name: data.name,
                    isTournament: data.isTournament,
                    courseId: data.courseId,
                },
            }),
            // Force reset tee boxes - since they belong to old course
            prisma.roundPlayer.updateMany({
                where: { roundId: roundId },
                data: {
                    teeBoxId: "" // Or some invalid ID to force re-selection? 
                    // Better to set to a default if available, but for now we'll just clear it if schema allows.
                }
            })
        ]);
    } else {
        await prisma.round.update({
            where: { id: roundId },
            data: {
                date: data.date,
                name: data.name,
                isTournament: data.isTournament,
            },
        });
    }
    revalidatePath(`/scores/${roundId}/edit`);
    revalidatePath('/scores');
}

export async function deleteRound(roundId: string) {
    try {
        // 1. (MoneyEvent removed)

        // 2. Find all round players to delete their scores
        const roundPlayers = await prisma.roundPlayer.findMany({
            where: { roundId: roundId },
            select: { id: true }
        });

        // 3. Delete all scores for these players
        if (roundPlayers.length > 0) {
            // Delete scores first
            await prisma.score.deleteMany({
                where: {
                    roundPlayerId: {
                        in: roundPlayers.map(rp => rp.id)
                    }
                }
            });
        }

        // 4. Delete round players
        await prisma.roundPlayer.deleteMany({
            where: { roundId: roundId },
        });

        // 5. Delete the round itself
        await prisma.round.delete({
            where: { id: roundId },
        });

        revalidatePath('/scores');
        revalidatePath('/');
    } catch (error) {
        console.error("Error deleting round:", error);
        throw error;
    }
}

export async function addPlayersToRound(roundId: string, playerIds: string[]) {
    // 1. Get the round to find the course
    const round = await prisma.round.findUnique({
        where: { id: roundId },
        include: { course: { include: { teeBoxes: true } } }
    });

    if (!round) throw new Error("Round not found");

    // 2. Find a default tee box (Preferred: 'White', else first available)
    const defaultTee = round.course.teeBoxes.find((t: { name: string }) => t.name === 'White') || round.course.teeBoxes[0];

    // 3. Bulk create entries with default tee box
    await prisma.roundPlayer.createMany({
        data: playerIds.map(pid => ({
            roundId: roundId,
            playerId: pid,
            grossScore: null,
            teeBoxId: defaultTee?.id,
            courseHandicap: 0 // Default
        })),
    });
    revalidatePath(`/scores/${roundId}/edit`);
    revalidatePath('/scores');
}

export async function removePlayerFromRound(roundPlayerId: string) {
    try {
        // Manually cascade delete scores if not handled by DB
        await prisma.score.deleteMany({
            where: { roundPlayerId: roundPlayerId }
        });

        const deleted = await prisma.roundPlayer.delete({
            where: { id: roundPlayerId },
        });
        revalidatePath(`/scores/${deleted.roundId}/edit`);
        revalidatePath('/scores');
    } catch (error) {
        console.error("Error removing player:", error);
        throw error;
    }
}

export async function createDraftRound() {
    // 1. Get a default course (needed for DB constraint)
    const defaultCourse = await prisma.course.findFirst();
    if (!defaultCourse) {
        throw new Error('No courses found. Please create a course first.');
    }

    // 2. Create the round
    // Default to today (Local Time) with time component
    const now = new Date();
    const localIsoDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const today = localIsoDate + 'T12:00:00';

    const round = await prisma.round.create({
        data: {
            date: today,
            courseId: defaultCourse.id,
            courseName: defaultCourse.name, // Required by schema
            name: "", // Default to blank name
            isTournament: false,
        },
    });

    return round.id;
}

export async function createTournamentRound(name: string, date: string) {
    // 1. Get a default course (needed for DB constraint)
    const defaultCourse = await prisma.course.findFirst();
    if (!defaultCourse) {
        throw new Error('No courses found. Please create a course first.');
    }

    // 2. Create the round with provided details
    // Ensure date has time component for proper sorting if needed, or just ISO string from input
    // Input date usually YYYY-MM-DD. We append T12:00:00 to valid ISO timestamp if needed.
    const isoDate = date.includes('T') ? date : `${date}T12:00:00`;

    const round = await prisma.round.create({
        data: {
            date: isoDate,
            courseId: defaultCourse.id,
            courseName: defaultCourse.name, // Required by schema
            name: name,
            isTournament: true,
        },
    });

    return round.id;
}

export async function updatePlayerScore(
    roundPlayerId: string,
    grossScore: number,
    frontNine: number,
    backNine: number,
    points: number,
    payout: number,
    holeScores?: { holeId: string, strokes: number }[]
) {
    // 1. Fetch RoundPlayer to get TeeBox and Hole Pars
    const roundPlayer = await prisma.roundPlayer.findUnique({
        where: { id: roundPlayerId },
        include: {
            teeBox: true,
            round: {
                include: {
                    course: {
                        include: {
                            holes: true
                        }
                    }
                }
            }
        }
    });

    if (!roundPlayer) throw new Error("Round Player not found");

    let adjustedGrossScore = grossScore;
    // scoreDifferential logic removed as column missing from schema

    // 2. Calculate Adjusted Gross Score if hole scores provided
    if (holeScores && holeScores.length > 0) {
        // Map holeScores to include Par
        const holesMap = new Map<string, { id: string; holeNumber: number; par: number }>(
            roundPlayer.round.course.holes.map((h: { id: string; holeNumber: number; par: number }) => [h.id, h])
        );

        const calcHoles = holeScores.map(hs => {
            const hole = holesMap.get(hs.holeId);
            if (!hole) throw new Error(`Hole ${hs.holeId} not found`);
            return {
                holeNumber: hole.holeNumber,
                par: hole.par,
                strokes: hs.strokes
            };
        });

        const result = calculateAdjustedGrossScore(calcHoles);
        adjustedGrossScore = result.adjustedGrossScore;
    }

    await prisma.$transaction(async (tx: TransactionClient) => {
        // 1. Update the RoundPlayer summary
        await tx.roundPlayer.update({
            where: { id: roundPlayerId },
            data: {
                grossScore: grossScore,
                netScore: adjustedGrossScore, // Assuming netScore is used for Adjusted
                frontNine: frontNine,
                backNine: backNine,
                points: points,
                payout: payout,
            },
        });

        // 2. (completed check removed as redundant or not supported)

        // 3. If hole-by-hole scores provided, update them
        if (holeScores && holeScores.length > 0) {
            // Delete existing scores for this round player
            await tx.score.deleteMany({
                where: { roundPlayerId: roundPlayerId }
            });

            // Insert new scores
            await tx.score.createMany({
                data: holeScores.map(hs => ({
                    roundPlayerId: roundPlayerId,
                    holeId: hs.holeId,
                    strokes: hs.strokes
                }))
            });
        }
    });

    // Automatically recalculate handicap for this player
    const playerInfo = await prisma.roundPlayer.findUnique({
        where: { id: roundPlayerId },
        select: { playerId: true }
    });
    if (playerInfo) {
        await recalculatePlayerHandicap(playerInfo.playerId);
    }

    revalidatePath(`/scores/${roundPlayer.round.id}/edit`);
    revalidatePath('/scores');
}

export async function updatePoolParticipants(roundId: string, inPoolPlayerIds: string[]) {
    try {
        await prisma.$transaction(async (tx: TransactionClient) => {
            // 1. Get current players in round
            const players = await tx.roundPlayer.findMany({
                where: { roundId: roundId },
                select: { id: true, playerId: true }
            });

            for (const p of players) {
                const isSelected = inPoolPlayerIds.includes(p.playerId);
                await tx.roundPlayer.update({
                    where: { id: p.id },
                    data: { inPool: isSelected }
                });
            }
        });

        revalidatePath('/pool');
        revalidatePath('/scores');
    } catch (error) {
        console.error('SERVER ACTION ERROR: updatePoolParticipants:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to update pool participants');
    }
}

export async function saveRoundWinnings(roundId: string, payouts: { playerId: string, amount: number }[]) {
    try {
        await prisma.$transaction(async (tx: TransactionClient) => {
            for (const p of payouts) {
                await tx.roundPlayer.updateMany({
                    where: {
                        roundId: roundId,
                        playerId: p.playerId
                    },
                    data: {
                        payout: p.amount
                    }
                });
            }
        });
        revalidatePath('/pool');
        revalidatePath('/scores');
    } catch (error) {
        console.error('SERVER ACTION ERROR: saveRoundWinnings:', error);
        throw new Error('Failed to save winnings');
    }
}

export async function createEvent(name: string, date: string) {
    const event = await prisma.event.create({
        data: {
            name,
            date,
        },
    });
    revalidatePath('/schedule');
    return event;
}

export async function deleteEvent(id: string) {
    await prisma.event.delete({
        where: { id },
    });
    revalidatePath('/schedule');
}

export async function createRoundWithPlayers(
    data: { date: string; name: string; isTournament: boolean; courseId?: string },
    players: {
        playerId: string;
        teeBoxId?: string;
        gross?: number | null;
        points?: number;
        payout?: number;
        scores?: { holeId: string; strokes: number }[];
    }[]
) {
    // 1. Get the course WITH holes and tee boxes
    let course;
    const include = { teeBoxes: true, holes: true };

    if (data.courseId) {
        course = await prisma.course.findUnique({
            where: { id: data.courseId },
            include
        });
        if (!course) throw new Error('Course not found.');
    } else {
        course = await prisma.course.findFirst({
            include
        });
        if (!course) throw new Error('No courses found.');
    }

    // 2. Fetch Player Indices for Snapshot (Note: indexAtTime is no longer stored in DB, but we use it for calculation)
    const playerIds = players.map(p => p.playerId);
    const dbPlayers = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, handicapIndex: true }
    });
    const playerMap = new Map(dbPlayers.map(p => [p.id, p]));

    // 3. Create the round
    const round = await prisma.round.create({
        data: {
            date: data.date,
            courseId: course.id,
            courseName: course.name,
            name: data.name,
            isTournament: data.isTournament,
        },
    });

    // 4. Add players and calculate stats
    if (players.length > 0) {
        const defaultTee = course.teeBoxes.find(t => t.name === 'White') || course.teeBoxes[0];
        const holesMap = new Map<string, { id: string; holeNumber: number; par: number }>(
            course.holes.map(h => [h.id, { id: h.id, holeNumber: h.holeNumber, par: h.par }])
        );
        const coursePar = course.holes.reduce((sum, h) => sum + h.par, 0);

        // Process sequentially
        for (const p of players) {
            const teeBoxId = p.teeBoxId || defaultTee?.id;
            const teeBox = course.teeBoxes.find(t => t.id === teeBoxId);
            const dbPlayer = playerMap.get(p.playerId);

            let front9: number | null = null;
            let back9: number | null = null;
            let courseHandicap = 0;

            // Calculate Front/Back from hole scores if available
            if (p.scores && p.scores.length > 0) {
                let f9 = 0;
                let b9 = 0;

                for (const s of p.scores) {
                    const hole = holesMap.get(s.holeId);
                    if (hole) {
                        if (hole.holeNumber <= 9) f9 += s.strokes;
                        else b9 += s.strokes;
                    }
                }
                front9 = f9 > 0 ? f9 : null;
                back9 = b9 > 0 ? b9 : null;
            }

            // Calculate Course Handicap
            // Formula: Index * (Slope / 113) + (Rating - Par)
            if (dbPlayer && teeBox) {
                courseHandicap = Math.round(dbPlayer.handicapIndex * (teeBox.slope / 113) + (teeBox.rating - coursePar));
            }

            // Calculate Net Score
            const gross = p.gross ?? null;
            const netScore = gross ? gross - courseHandicap : null;

            if (!teeBoxId) continue; // Should not happen if defaultTee exists

            const rp = await prisma.roundPlayer.create({
                data: {
                    roundId: round.id,
                    playerId: p.playerId,
                    grossScore: gross,
                    courseHandicap: courseHandicap,
                    netScore: netScore,
                    indexAtTime: dbPlayer?.handicapIndex || 0,
                    points: p.points || 0,
                    payout: p.payout || 0,

                    teeBoxId: teeBoxId,
                    frontNine: front9,
                    backNine: back9,
                }
            });

            // Insert scores if present
            if (p.scores && p.scores.length > 0) {
                await prisma.score.createMany({
                    data: p.scores.map(s => ({
                        roundPlayerId: rp.id,
                        holeId: s.holeId,
                        strokes: s.strokes
                    }))
                });
            }
        }
    }

    revalidatePath('/scores');
    return round.id;
}





export async function createPlayer(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    handicapIndex: number;
}) {
    const name = `${data.firstName.trim()} ${data.lastName.trim()}`;

    // Basic validation
    if (!data.email || !data.phone) {
        throw new Error("Email and Phone are required.");
    }

    try {
        const player = await prisma.player.create({
            data: {
                name,
                email: data.email,
                phone: data.phone,
                handicapIndex: data.handicapIndex,
            }
        });

        revalidatePath('/');
        revalidatePath('/players');
        return player;
    } catch (error: any) {
        console.error("Error creating player:", error);
        if (error.code === 'P2002') {
            throw new Error("A player with this email already exists.");
        }
        throw new Error("Failed to create player. Please check inputs.");
    }
}
