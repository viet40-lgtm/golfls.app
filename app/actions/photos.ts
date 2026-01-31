'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function uploadPhoto(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const date = formData.get('date') as string;
        const caption = formData.get('caption') as string;

        if (!file || !date) {
            return { success: false, error: 'Missing required fields' };
        }

        // Convert file to Base64 (Data URI)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const mimeType = file.type || 'image/jpeg'; // Default to jpeg if unknown

        // This stores the FULL image data in the DB "url" field
        // Requires client-side compression to keep size reasonable (~300-500KB)
        const url = `data:${mimeType};base64,${base64}`;

        await prisma.photo.create({
            data: {
                url, // Storing Data URI directly
                date,
                caption
            }
        });

        revalidatePath('/photos');
        return { success: true };

    } catch (error) {
        console.error('Upload error:', error);
        // Better error message handling
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: 'Failed to upload photo: ' + msg };
    }
}

export async function deletePhoto(photoId: string) {
    try {
        // Just delete from DB. No file cleanup needed since data is in the row.
        await prisma.photo.delete({ where: { id: photoId } });

        revalidatePath('/photos');
        return { success: true };
    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: 'Failed to delete photo' };
    }
}

export async function updatePhoto(id: string, date: string, caption: string) {
    try {
        await prisma.photo.update({
            where: { id },
            data: { date, caption }
        });
        revalidatePath('/photos');
        return { success: true };
    } catch (error) {
        console.error('Update photo error:', error);
        return { success: false, error: 'Failed to update photo' };
    }
}

export async function getPhotos(offset: number, limit: number) {
    try {
        const photos = await prisma.photo.findMany({
            orderBy: { date: 'desc' },
            take: limit,
            skip: offset,
        });
        return { success: true, photos };
    } catch (error) {
        console.error('Fetch photos error:', error);
        return { success: false, error: 'Failed to fetch photos' };
    }
}
