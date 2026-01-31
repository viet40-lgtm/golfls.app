'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createCourse(data: {
    name: string,
    tees: { name: string, rating: number, slope: number }[],
    holes: {
        holeNumber: number,
        par: number,
        difficulty: number | null,
        latitude?: number | null,
        longitude?: number | null,
        elements?: {
            side: string;
            elementNumber: number;
            frontLatitude?: number | null;
            frontLongitude?: number | null;
            backLatitude?: number | null;
            backLongitude?: number | null;
            water: boolean;
            bunker: boolean;
            tree: boolean;
        }[]
    }[]
}) {
    await prisma.course.create({
        data: {
            name: data.name,
            teeBoxes: {
                create: data.tees.map(t => ({
                    name: t.name,
                    rating: t.rating,
                    slope: t.slope,
                    par: data.holes.reduce((sum, h) => sum + h.par, 0)
                }))
            },
            holes: {
                create: data.holes.map(h => ({
                    holeNumber: h.holeNumber,
                    par: h.par,
                    difficulty: h.difficulty,
                    latitude: h.latitude,
                    longitude: h.longitude,
                    elements: h.elements ? {
                        create: h.elements.map(e => ({
                            side: e.side,
                            elementNumber: e.elementNumber,
                            frontLatitude: e.frontLatitude,
                            frontLongitude: e.frontLongitude,
                            backLatitude: e.backLatitude,
                            backLongitude: e.backLongitude,
                            water: e.water,
                            bunker: e.bunker,
                            tree: e.tree
                        }))
                    } : undefined
                }))
            }
        }
    });

    revalidatePath('/settings');
    redirect('/settings');
}
