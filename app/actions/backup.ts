'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function getBackupData() {
    try {
        const [players, courses, rounds, roundPlayers, scores, photos, events, liveRounds, liveRoundPlayers, liveScores] = await Promise.all([
            prisma.player.findMany(),
            prisma.course.findMany({ include: { teeBoxes: true, holes: true } }),
            prisma.round.findMany(),
            prisma.roundPlayer.findMany(),
            prisma.score.findMany(),
            prisma.photo.findMany(),
            prisma.event.findMany(),
            prisma.liveRound.findMany(),
            prisma.liveRoundPlayer.findMany(),
            prisma.liveScore.findMany()
        ]);

        const backup = {
            version: 3, // Increment version for new backup format
            timestamp: new Date().toISOString(),
            data: {
                players,
                courses,
                rounds,
                roundPlayers,
                scores,
                photos,
                events,
                liveRounds,
                liveRoundPlayers,
                liveScores
            }
        };

        return { success: true, data: JSON.stringify(backup, null, 2) };
    } catch (error) {
        console.error('Backup failed:', error);
        return { success: false, error: 'Failed to generate backup' };
    }
}

export async function restoreBackupData(jsonString: string) {
    try {
        const backup = JSON.parse(jsonString);

        if (!backup.data) throw new Error('Invalid backup format');

        // Allow partial restore if some fields are missing in older backups
        const { players, courses, rounds, roundPlayers, scores, photos, events, liveRounds, liveRoundPlayers, liveScores } = backup.data;

        await prisma.$transaction(async (tx: TransactionClient) => {
            // 1. Clean existing data (Dependents first)
            // Use try-catch or safe delete if tables don't exist? No, schema assumes they exist.
            await tx.liveScore.deleteMany();
            await tx.liveRoundPlayer.deleteMany();
            await tx.liveRound.deleteMany();
            // await tx.moneyEvent.deleteMany(); // Removed from schema
            await tx.score.deleteMany();
            await tx.roundPlayer.deleteMany();
            // await tx.handicapRound.deleteMany(); // Removed
            await tx.round.deleteMany();
            await tx.photo.deleteMany();
            await tx.event.deleteMany();
            await tx.hole.deleteMany();
            await tx.teeBox.deleteMany();
            await tx.course.deleteMany();
            await tx.player.deleteMany();

            // 2. Restore Players
            if (players?.length) {
                await tx.player.createMany({ data: players });
            }

            // 3. Restore Courses
            if (courses?.length) {
                console.log('Restoring Courses...');
                for (const course of courses) {
                    // Check for both snake_case (legacy backup) and camelCase properties
                    const teeBoxesData = course.teeBoxes || course.tee_boxes;
                    const holesData = course.holes;

                    // Remove relation and legacy properties from courseData
                    const { teeBoxes, tee_boxes, holes, course_id, ...courseData } = course;

                    const cleanTeeBoxes = teeBoxesData?.map((t: any) => {
                        const { courseId, course_id, ...rest } = t; // Remove FK
                        return {
                            ...rest,
                            // Map snake_case to camelCase if needed, or rely on schema matching
                            // Current schema uses camelCase for properties like courseId, but DB map might differ.
                            // However, restore object should match prisma input types.
                            // If backup has snake_case (e.g. course_id), we stripped it.
                            // If backup is old, it might have snake_case fields for properties.
                            // LET'S ASSUME backup matches schema or is "close enough" for simple fields.
                            // IMPORTANT: Prisma CreateInput expects camelCase property names defined in schema.
                        };
                    });

                    const cleanHoles = holesData?.map((h: any) => {
                        const { courseId, course_id, ...rest } = h;
                        return rest;
                    });

                    await tx.course.create({
                        data: {
                            ...courseData,
                            teeBoxes: { create: cleanTeeBoxes },
                            holes: { create: cleanHoles }
                        }
                    });
                }
            }

            // 4. Restore Rounds
            if (rounds?.length) {
                await tx.round.createMany({ data: rounds });
            }

            // 5. Restore Round Players
            if (roundPlayers?.length) {
                await tx.roundPlayer.createMany({ data: roundPlayers });
            }

            // 6. Manual Rounds (HandicapRound) - REMOVED
            // if (handicapRounds?.length) ...

            // 7. Restore Scores
            if (scores?.length) {
                await tx.score.createMany({ data: scores });
            }

            // 8. Restore Photos
            if (photos?.length) {
                await tx.photo.createMany({ data: photos });
            }

            // 9. Restore Events
            if (events?.length) {
                await tx.event.createMany({ data: events });
            }

            // 10. Restore Live Rounds
            if (liveRounds?.length) {
                await tx.liveRound.createMany({ data: liveRounds });
            }

            // 11. Restore Live Round Players
            if (liveRoundPlayers?.length) {
                await tx.liveRoundPlayer.createMany({ data: liveRoundPlayers });
            }

            // 12. Restore Live Scores
            if (liveScores?.length) {
                await tx.liveScore.createMany({ data: liveScores });
            }

            // 13. Money Events - Removed
        }, { timeout: 60000 });

        revalidatePath('/');
        console.log('✅ Restore completed successfully');
        return { success: true };
    } catch (error) {
        console.error('Restore failed:', error);
        return { success: false, error: `Failed to restore: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function backupPhotosToLocal() {
    try {
        const fs = require('fs');
        const path = require('path');
        // Node 18+ has native fetch, so we don't need to require it.
        // If on older node, we might need a polyfill, but assuming recent Next.js.

        const photos = await prisma.photo.findMany();
        if (!photos.length) return { success: false, error: 'No photos to backup' };

        // Targeted backup directory
        const backupDir = String.raw`C:\Users\viet4\Documents\Antigravity\golf-v3\photos`;

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (const photo of photos) {
            try {
                const fileName = path.basename(photo.url);
                const destPath = path.join(backupDir, fileName);

                // Skip if file already exists
                if (fs.existsSync(destPath)) {
                    skippedCount++;
                    continue;
                }

                // If remote URL (vercel blob)
                if (photo.url.startsWith('http')) {
                    const response = await fetch(photo.url);
                    if (!response.ok) throw new Error(`Failed to fetch ${photo.url}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    fs.writeFileSync(destPath, buffer);
                }
                // If local file path (e.g. /uploads/...)
                else {
                    // Remove leading slash for local path resolution
                    const relativePath = photo.url.startsWith('/') ? photo.url.slice(1) : photo.url;
                    const sourcePath = path.join(process.cwd(), 'public', relativePath);

                    if (fs.existsSync(sourcePath)) {
                        fs.copyFileSync(sourcePath, destPath);
                    } else {
                        console.warn(`Local file not found: ${sourcePath}`);
                        failCount++;
                        continue;
                    }
                }
                successCount++;
            } catch (err) {
                console.error(`Failed to backup photo ${photo.id}:`, err);
                failCount++;
            }
        }

        return {
            success: true,
            message: `Backup complete. Downloaded: ${successCount}, Skipped: ${skippedCount}, Failed: ${failCount}`
        };

    } catch (error) {
        console.error('Photo backup failed:', error);
        return { success: false, error: 'Failed to execute photo backup' };
    }
}
