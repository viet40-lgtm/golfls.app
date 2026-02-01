'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function createPlayer(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string | null;
    const phone = formData.get('phone') as string | null;
    const password = formData.get('password') as string | null;
    const preferredTeeBox = formData.get('preferredTeeBox') as string | null;
    const birthday = formData.get('birthday') as string | null;
    const dateStarted = formData.get('dateStarted') as string | null;
    const handicapIndex = formData.get('handicapIndex') as string | null;
    const estimateHandicap = formData.get('estimateHandicap') as string | null;

    if (!name || name.trim() === '') {
        return { success: false, error: 'Name is required' };
    }

    try {
        // Generate custom ID: FirstName + Last4Phone
        const firstName = name.trim().split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
        const cleanPhone = phone?.replace(/\D/g, '') || '';
        const last4Phone = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();

        const customId = `${firstName}${last4Phone}`;
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        await prisma.player.create({
            data: {
                id: customId,
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                password: hashedPassword,
                birthday: birthday || null,
                dateStarted: dateStarted || null,
                preferredTeeBox: preferredTeeBox || null,
                handicapIndex: handicapIndex ? parseFloat(handicapIndex) : 0,
                estimateHandicap: estimateHandicap ? parseInt(estimateHandicap) : 0,
            }
        });

        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to create player:', error);
        return { success: false, error: 'Failed to create player' };
    }
}
