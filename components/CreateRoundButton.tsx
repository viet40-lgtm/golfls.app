'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDraftRound } from '@/app/actions';

export default function CreateRoundButton() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        // Just navigate to the new page - do not create a DB record yet
        router.push('/scores/new');
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="bg-black hover:bg-gray-800 text-white text-[14pt] font-bold px-1 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
        >
            {isPending ? 'Creating...' : 'New'}
        </button>
    );
}
