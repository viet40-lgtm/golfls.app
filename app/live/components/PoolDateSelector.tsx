'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface RoundOption {
    id: string;
    date: string;
    is_tournament: boolean;
    name?: string | null;
    _count: { players: number };
}

export function PoolDateSelector({
    allRounds,
    currentRoundId,
    onSelect
}: {
    allRounds: any[],
    currentRoundId: string,
    onSelect?: (id: string) => void
}) {
    const router = useRouter();

    return (
        <select
            title="Select Round"
            className="flex-1 mx-1 bg-white border border-gray-300 rounded-lg px-1 sm:px-1 py-2 sm:py-2.5 text-[14pt] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none min-w-0 cursor-pointer hover:bg-gray-50 transition-colors"
            value={currentRoundId}
            onChange={(e) => {
                if (onSelect) {
                    onSelect(e.target.value);
                } else {
                    router.push(`/pool?roundId=${e.target.value}`);
                }
            }}
        >
            {allRounds.map(r => {
                const playerCount = r._count?.players || 0;

                const [y, m, d] = r.date.split('T')[0].split('-').map(Number);
                const dStr = format(new Date(y, m - 1, d, 12, 0, 0), 'MMM d, yyyy');

                const displayName = r.name
                    ? `${r.name} (${dStr}) - ${playerCount}`
                    : `${dStr} - ${playerCount}`;

                return (
                    <option key={r.id} value={r.id}>
                        {displayName}{r.is_tournament ? ' 🏆' : ''}
                    </option>
                );
            })}
        </select>
    );
}
