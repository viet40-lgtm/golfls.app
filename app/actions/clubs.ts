'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createClub(data: { name: string; location?: string }) {
    if (!data.name) {
        throw new Error("Club name is required.");
    }

    try {
        const club = await prisma.club.create({
            data: {
                name: data.name,
                location: data.location,
            }
        });

        revalidatePath('/settings');
        revalidatePath('/clubs');
        return club;
    } catch (error) {
        console.error("Error creating club:", error);
        throw new Error("Failed to create club.");
    }
}

export async function updateClub(clubId: string, data: { name: string; location?: string }) {
    try {
        const club = await prisma.club.update({
            where: { id: clubId },
            data: {
                name: data.name,
                location: data.location
            }
        });

        revalidatePath('/settings');
        revalidatePath('/clubs');
        return club;
    } catch (error) {
        console.error("Error updating club:", error);
        throw new Error("Failed to update club.");
    }
}

export async function deleteClub(clubId: string) {
    try {
        await prisma.club.delete({
            where: { id: clubId }
        });

        revalidatePath('/settings');
        revalidatePath('/clubs');
    } catch (error) {
        console.error("Error deleting club:", error);
        throw new Error("Failed to delete club.");
    }
}
