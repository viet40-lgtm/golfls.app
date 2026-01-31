'use client';

import { useState, useEffect } from 'react';

type Player = {
    id: string;
    name: string;
    index: number;
};

export default function CourseCalculator({ players }: { players: Player[] }) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const [index, setIndex] = useState<string>('');
    const [par, setPar] = useState<string>('72');
    const [rating, setRating] = useState<string>('');
    const [slope, setSlope] = useState<string>('');
    const [courseHcp, setCourseHcp] = useState<number | null>(null);

    useEffect(() => {
        if (selectedPlayerId && selectedPlayerId !== 'manual') {
            const player = players.find(p => p.id === selectedPlayerId);
            if (player) {
                setIndex(player.index.toString());
            }
        } else if (selectedPlayerId === 'manual') {
            setIndex('');
        }
    }, [selectedPlayerId, players]);

    useEffect(() => {
        const idxVal = parseFloat(index);
        const parVal = parseFloat(par);
        const ratingVal = parseFloat(rating);
        const slopeVal = parseFloat(slope);

        if (!isNaN(idxVal) && !isNaN(parVal) && !isNaN(ratingVal) && !isNaN(slopeVal)) {
            // Formula: (Index × Slope / 113) + (Rating - Par)
            const result = (idxVal * slopeVal / 113) + (ratingVal - parVal);
            setCourseHcp(Math.round(result));
        } else {
            setCourseHcp(null);
        }
    }, [index, par, rating, slope]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full m-1 mt-3">
            <div className="py-3 px-1 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-[14pt] font-bold text-center text-gray-900">Quick Course Calculator</h3>

            </div>

            <div className="py-3 px-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-3">
                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1.5">Select Member</label>
                        <select
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="w-full px-1 py-2.5 bg-white border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all no-spinner"
                        >
                            <option value="">Choose member or manual entry</option>
                            <option value="manual">Manual Entry</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.index})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1.5 font-mono uppercase tracking-tight">Index</label>
                        <input
                            type="number"
                            step="0.1"
                            value={index}
                            onChange={(e) => setIndex(e.target.value)}
                            placeholder="Enter your index"
                            className="w-full px-1 py-2.5 bg-white border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all no-spinner"
                        />
                    </div>

                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1.5 font-mono uppercase tracking-tight">Par</label>
                        <input
                            type="number"
                            value={par}
                            onChange={(e) => setPar(e.target.value)}
                            placeholder="Enter course par"
                            className="w-full px-1 py-2.5 bg-white border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all no-spinner"
                        />
                    </div>

                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1.5 font-mono uppercase tracking-tight">Rating</label>
                        <input
                            type="number"
                            step="0.1"
                            value={rating}
                            onChange={(e) => setRating(e.target.value)}
                            placeholder="Enter course rating"
                            className="w-full px-1 py-2.5 bg-white border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all no-spinner"
                        />
                    </div>

                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1.5 font-mono uppercase tracking-tight">Slope</label>
                        <input
                            type="number"
                            value={slope}
                            onChange={(e) => setSlope(e.target.value)}
                            placeholder="Enter slope rating"
                            className="w-full px-1 py-2.5 bg-white border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all no-spinner"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 bg-gray-50 rounded-2xl border border-gray-100 py-3 px-1 self-start md:mt-3">
                    <span className="text-[14pt] font-bold text-gray-500 uppercase tracking-widest">Course HCP</span>
                    <div className="text-6xl font-black text-green-700">
                        {courseHcp !== null ? courseHcp : '--'}
                    </div>
                    <div className="text-[14pt] text-gray-400 font-mono mt-4 text-center">
                        Formula: (Index × Slope / 113) + (Rating - Par)
                    </div>
                </div>
            </div>
        </div>
    );
}
