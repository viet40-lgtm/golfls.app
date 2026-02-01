
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function getCurrentPlayerProfile() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('session_userId')?.value;

        if (!userId) return null;

        const player = await prisma.player.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                handicapIndex: true,
                estimateHandicap: true,
                preferredTeeBox: true,
                playerId: true,
            }
        });

        return player;
    } catch (error) {
        console.error('Failed to get current player:', error);
        return null;
    }
}

export async function updatePlayerProfile(formData: FormData) {
    const id = formData.get('id') as string;

    // Extract valid fields
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const birthday = formData.get('birthday') as string;
    const dateStarted = formData.get('dateStarted') as string;
    const preferredTeeBox = formData.get('preferredTeeBox') as string;
    const handicapIndex = formData.get('handicapIndex') as string;
    const estimateHandicap = formData.get('estimateHandicap') as string;
    const password = formData.get('password') as string;

    const name = `${firstName.trim()} ${lastName.trim()}`;

    try {
        const updateData: any = {
            name,
            email: email || null,
            phone: phone || null,
            birthday: birthday || null,
            dateStarted: dateStarted || null,
            preferredTeeBox: preferredTeeBox || null,
            handicapIndex: handicapIndex ? parseFloat(handicapIndex) : 0,
            estimateHandicap: estimateHandicap ? parseInt(estimateHandicap) : 0,
        };

        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.player.update({
            where: { id },
            data: updateData,
        });

        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to update player:', error);
        return { success: false, error: 'Failed to update profile' };
    }
}
