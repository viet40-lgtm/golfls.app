'use client';

import { useState } from 'react';
import { ScorecardModal } from './ScorecardModal';
import { getScorecardDetails } from '../actions/get-scorecard';
// Re-using ScorecardModal from ScoresDashboard usually requires it to be exported.
// If it's not exported, I'll need to duplicate it or move it to a shared file. 
// Assuming for now I can export it from ScoresDashboard.tsx or make a new file.
// Wait, ScoresDashboard has it internal. I should extract it.
// But first let's define this component.

const LoaderIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
    </svg>
);

export default function PoolResults({
    allPoolParticipants,
    poolActivePlayers,
    round,
    flights,
    processedFlights,
    winningsMap,
    onClose
}: {
    allPoolParticipants: any[];
    poolActivePlayers: any[];
    round: any;
    flights: any[];
    processedFlights: any[];
    winningsMap: Record<string, number>;
    onClose: () => void;
}) {
    const [selectedScorecard, setSelectedScorecard] = useState<any>(null);
    const [isLoadingScorecard, setIsLoadingScorecard] = useState<string | null>(null);

    const handlePlayerClick = async (playerId: string) => {
        // We need the ROUND PLAYER ID, but the input might only have player ID if coming from results.
        // Let's find the round player ID.
        const rp = round.players.find((p: any) => p.playerId === playerId);
        if (!rp) return;

        if (isLoadingScorecard) return;
        setIsLoadingScorecard(rp.id);

        const result = await getScorecardDetails(rp.id);
        setIsLoadingScorecard(null);

        if (result.data) {
            setSelectedScorecard(result.data);
        } else {
            alert('Could not load scorecard details.');
        }
    };

    return (
        <div className="p-6 space-y-8">
            {allPoolParticipants.length === 0 ? (
                // ... Empty State 1 ...
                <div className="text-center">No participants selected.</div>
            ) : poolActivePlayers.length === 0 ? (
                // ... Empty State 2 ...
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="bg-amber-50 rounded-full p-8 text-amber-500">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-[14pt] font-black text-gray-900 tracking-tight">Waiting for Scores</h3>
                        <p className="text-[14pt] text-gray-500 max-w-md mx-auto">
                            {allPoolParticipants.length} players are set for the pool, but they haven't posted scores for this round yet.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {processedFlights.map((flight, fIdx) => (
                        <div key={fIdx} className="space-y-12">
                            {/* Flight Header */}
                            {flights.length > 1 && (
                                <div className="border-b-2 border-gray-900 pb-2">
                                    <h2 className="text-[14pt] font-black text-gray-900 uppercase tracking-tighter">{flight.name}</h2>
                                </div>
                            )}

                            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Vertical Divider for Desktop */}
                                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -ml-[0.5px]"></div>

                                {/* Front Nine */}
                                <div className="space-y-4">
                                    <div className="text-center pb-2 border-b border-gray-900 mb-4">
                                        <h3 className="text-[14pt] font-black text-gray-900 uppercase tracking-widest">Front Nine</h3>
                                        <div className="text-[14pt] font-black text-green-600 mt-0.5">${flight.pots.front.toFixed(2)}</div>
                                    </div>
                                    <div className="space-y-3">
                                        {flight.frontWinners.map((w: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center group">
                                                <div className="flex gap-3 items-center flex-1">
                                                    <button
                                                        onClick={() => handlePlayerClick(w.id)}
                                                        className="flex flex-col text-left cursor-pointer p-1 rounded"
                                                    >
                                                        <span className="text-[14pt] font-black text-blue-600 underline decoration-black decoration-2 leading-tight">
                                                            {w.name.split(' ')[0]}
                                                        </span>
                                                        <span className="text-[14pt] text-gray-600 leading-none">
                                                            {w.name.split(' ').slice(1).join(' ')}
                                                        </span>
                                                    </button>
                                                    {isLoadingScorecard === w.id && <LoaderIcon className="w-4 h-4 animate-spin text-gray-400" />}
                                                </div>
                                                <div className="text-right flex items-center gap-0 w-[220px] justify-end">
                                                    <span className="text-[14pt] text-gray-800 font-medium w-[35px] text-center" title="Gross">{w.gross}</span>
                                                    <span className="text-[14pt] text-gray-400 font-medium w-[35px] text-center" title="Half Hcp">{w.frontHcp}</span>
                                                    <span className="text-[14pt] font-black text-black w-[55px] text-center" title="Net">({w.score.toFixed(0)})</span>
                                                    <span className="text-[14pt] font-black text-green-600 w-[80px] text-right whitespace-nowrap">${w.amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Back Nine */}
                                <div className="space-y-4">
                                    <div className="text-center pb-2 border-b border-gray-900 mb-4">
                                        <h3 className="text-[14pt] font-black text-gray-900 uppercase tracking-widest">Back Nine</h3>
                                        <div className="text-[14pt] font-black text-green-600 mt-0.5">${flight.pots.back.toFixed(2)}</div>
                                    </div>
                                    <div className="space-y-3">
                                        {flight.backWinners.map((w: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center group">
                                                <div className="flex gap-3 items-center flex-1">
                                                    <button
                                                        onClick={() => handlePlayerClick(w.id)}
                                                        className="flex flex-col text-left cursor-pointer p-1 rounded"
                                                    >
                                                        <span className="text-[14pt] font-black text-blue-600 underline decoration-black decoration-2 leading-tight">
                                                            {w.name.split(' ')[0]}
                                                        </span>
                                                        <span className="text-[14pt] text-gray-600 leading-none">
                                                            {w.name.split(' ').slice(1).join(' ')}
                                                        </span>
                                                    </button>
                                                    {isLoadingScorecard === w.id && <LoaderIcon className="w-4 h-4 animate-spin text-gray-400" />}

                                                </div>
                                                <div className="text-right flex items-center gap-0 w-[220px] justify-end">
                                                    <span className="text-[14pt] text-gray-800 font-medium w-[35px] text-center" title="Gross">{w.gross}</span>
                                                    <span className="text-[14pt] text-gray-400 font-medium w-[35px] text-center" title="Half Hcp">{w.backHcp}</span>
                                                    <span className="text-[14pt] font-black text-black w-[55px] text-center" title="Net">({w.score.toFixed(0)})</span>
                                                    <span className="text-[14pt] font-black text-green-600 w-[80px] text-right whitespace-nowrap">${w.amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Total Section Divider */}
                            <div className="border-t-2 border-dashed border-gray-300 my-8"></div>

                            {/* Total Section */}
                            <div className="space-y-6">
                                <div className="text-center pb-2 border-b border-gray-900 max-w-sm mx-auto mb-6">
                                    <h3 className="text-[14pt] font-black text-gray-900 uppercase tracking-widest leading-none">Total</h3>
                                    <div className="text-[14pt] font-black text-green-600 mt-1">${flight.pots.total.toFixed(2)}</div>
                                </div>
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {flight.totalWinners.map((w: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center group">
                                            <div className="flex gap-4 items-center flex-1">
                                                <button
                                                    onClick={() => handlePlayerClick(w.id)}
                                                    className="flex flex-col text-left cursor-pointer"
                                                >
                                                    <span className="text-[14pt] font-black text-blue-600 underline decoration-black decoration-2 leading-tight">
                                                        {w.name.split(' ')[0]}
                                                    </span>
                                                    <span className="text-[14pt] text-gray-600 leading-none">
                                                        {w.name.split(' ').slice(1).join(' ')}
                                                    </span>
                                                </button>
                                                {isLoadingScorecard === w.id && <LoaderIcon className="w-4 h-4 animate-spin text-gray-400" />}
                                            </div>
                                            <div className="text-right flex items-center gap-0 w-[265px] justify-end">
                                                <span className="text-[14pt] text-gray-800 font-medium w-[45px] text-center" title="Gross">{w.gross}</span>
                                                <span className="text-[14pt] text-gray-400 font-medium w-[45px] text-center" title="Net">{w.courseHcp}</span>
                                                <span className="text-[14pt] font-black text-black w-[65px] text-center" title="Total">({w.score.toFixed(0)})</span>
                                                <span className="text-[14pt] font-black text-green-600 w-[110px] text-right whitespace-nowrap">${w.amount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Summary Section */}
                    <div className="pt-10 space-y-6">
                        <h3 className="text-[14pt] font-bold text-gray-900">Total by Winners:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(winningsMap || {})
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .map(([name, amount]) => (
                                    <div key={name} className="bg-[#f4fbf7] border border-green-100 rounded-lg p-3 flex justify-between items-center">
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[14pt] font-black text-black leading-none">{name.split(' ')[0]}{" "}</span>
                                            <span className="text-[14pt] text-gray-600 truncate">{name.split(' ').slice(1).join(' ')}</span>
                                        </div>
                                        <span className="text-[14pt] font-black text-green-600 ml-2 whitespace-nowrap">${amount.toFixed(2)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>

                </>
            )}

            {/* Scorecard Modal */}
            {selectedScorecard && (
                <ScorecardModal
                    data={selectedScorecard}
                    isOpen={!!selectedScorecard}
                    onClose={() => setSelectedScorecard(null)}
                />
            )}
        </div>
    );
}
