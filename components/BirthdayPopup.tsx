'use client';

import { useState, useEffect } from 'react';

interface Player {
    id: string;
    name: string;
    birthday: string | null; // Format: YYYY-MM-DD
}

interface BirthdayPopupProps {
    players: Player[];
}

export default function BirthdayPopup({ players }: BirthdayPopupProps) {
    const [birthdayPlayers, setBirthdayPlayers] = useState<(Player & { age: number })[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check for birthdays today
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 0-indexed
        const currentDay = today.getDate();
        const currentYear = today.getFullYear();

        const matches = players
            .filter(player => {
                if (!player.birthday) return false;

                // Parse YYYY-MM-DD
                const parts = player.birthday.split('-');
                if (parts.length !== 3) return false;

                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);

                return month === currentMonth && day === currentDay;
            })
            .map(player => {
                // Calculate age
                const parts = player.birthday!.split('-');
                const birthYear = parseInt(parts[0], 10);
                const age = currentYear - birthYear;
                return { ...player, age };
            });

        if (matches.length > 0) {
            // Check if we've already shown the popup for this session
            const hasShown = sessionStorage.getItem('birthday_popup_shown');
            if (!hasShown) {
                setBirthdayPlayers(matches);
                setIsOpen(true);
                sessionStorage.setItem('birthday_popup_shown', 'true');
            }
        }
    }, [players]);

    if (!isOpen || birthdayPlayers.length === 0) return null;

    return (
        <div
            className="fixed inset-0 z-[400] flex flex-col bg-white animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="flex-1 flex flex-col items-center justify-center w-full h-full p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full flex-1 flex flex-col overflow-hidden">
                    {/* Scrollable Cake Section */}
                    <div className="flex-1 overflow-y-auto mb-6 p-4 bg-pink-50 inner-shadow text-center flex items-center justify-center rounded-3xl mx-4 mt-8">
                        <div className="flex flex-wrap justify-center gap-2 text-[30pt] leading-none">
                            {birthdayPlayers.map(player => (
                                Array.from({ length: player.age }).map((_, i) => (
                                    <span key={`${player.id}-${i}`}>🎂</span>
                                ))
                            ))}
                        </div>
                    </div>

                    <div className="px-4 py-8 text-center bg-white">
                        <h1 className="text-[32pt] font-black text-pink-500 mb-4 leading-tight uppercase italic">
                            Happy Birthday!
                        </h1>

                        <div className="text-[20pt] font-bold text-gray-900 text-center mb-8 w-full space-y-4">
                            {birthdayPlayers.map((player) => (
                                <div key={player.id} className="mb-2 last:mb-0">
                                    <span className="block leading-tight text-black text-[24pt]">{player.name}</span>
                                    <span className="block text-[18pt] text-gray-500">Turning {player.age} today!</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="w-full bg-black text-white rounded-full py-4 text-[18pt] font-bold hover:bg-gray-800 transition-colors shadow-xl active:scale-95 shrink-0 max-w-md mx-auto"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
