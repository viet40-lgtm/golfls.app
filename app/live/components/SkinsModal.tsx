import React, { useMemo, useState, useEffect } from 'react';
import { X, Users, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { joinSkins, leaveSkins } from '../actions/skins';
import { calculateSkins } from '../lib/skins';

interface SkinHole {
    number: number;
    par: number;
    difficulty: number;
}

interface SkinPlayer {
    id: string;
    name: string;
    courseHandicap: number;
    scores: Record<number, number>;
}

interface SkinsModalProps {
    isOpen: boolean;
    onClose: () => void;
    liveRoundId: string;
    holes: SkinHole[];
    potentialPlayers: SkinPlayer[];
    participantIds: string[];
    onParticipantsChange: (ids: string[]) => void;
}

export function SkinsModal({
    isOpen,
    onClose,
    liveRoundId,
    holes,
    potentialPlayers,
    participantIds,
    onParticipantsChange
}: SkinsModalProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSelectionExpanded, setIsSelectionExpanded] = useState(true);
    const [carryOversEnabled, setCarryOversEnabled] = useState(true);

    // Auto-collapse selection if specific conditions met? 
    // User requested "on top section", implying always available. 
    // We'll keep it collapsible but default open if few players.
    useEffect(() => {
        if (isOpen && participantIds.length > 3) {
            setIsSelectionExpanded(false);
        } else {
            setIsSelectionExpanded(true);
        }
    }, [isOpen]);

    const activePlayers = useMemo(() => {
        return potentialPlayers.filter(p => participantIds.includes(p.id));
    }, [potentialPlayers, participantIds]);

    const handleToggle = async (playerId: string) => {
        if (isUpdating) return;
        setIsUpdating(true);
        const isParticipating = participantIds.includes(playerId);
        let newIds = [...participantIds];
        try {
            if (isParticipating) {
                await leaveSkins(liveRoundId, playerId);
                newIds = newIds.filter(id => id !== playerId);
            } else {
                await joinSkins(liveRoundId, playerId);
                newIds.push(playerId);
            }
            onParticipantsChange(newIds);
        } catch (error) {
            console.error("Failed to toggle skins participation:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const results = useMemo(() => {
        return calculateSkins(potentialPlayers, holes, participantIds, carryOversEnabled);
    }, [potentialPlayers, holes, participantIds, carryOversEnabled]);

    // Helper to chunk holes
    const holeChunks = useMemo(() => {
        const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
        const chunks = [];
        for (let i = 0; i < sortedHoles.length; i += 6) {
            chunks.push(sortedHoles.slice(i, i + 6));
        }
        return chunks;
    }, [holes]);

    // Calculate Dynamic Pot and Buy-In
    const totalWinnings = activePlayers.reduce((sum, p) => sum + (results?.playerTotals[p.id]?.winnings || 0), 0);
    // If Carry Overs ON: Pot is fixed (Total Holes) as money is always "in play" (pending or won).
    // If Carry Overs OFF: Pot is reduced to only Realized Winnings (Dead skins are removed from cost).
    const currentPot = carryOversEnabled ? holes.length : totalWinnings;
    const buyIn = activePlayers.length > 0 ? currentPot / activePlayers.length : 0;
    const remainingPot = currentPot - totalWinnings;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 h-[100dvh] z-[200] bg-white flex flex-col overflow-hidden font-sans">
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
                {/* Header & Controls */}
                <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <span className="text-[15pt] font-black text-green-700">$</span>
                            </div>
                            <div>
                                <h2 className="text-[15pt] font-black text-gray-900 leading-none">SKINS GAME</h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors active:scale-95"
                            aria-label="Close Skins Modal"
                        >
                            <X className="w-6 h-6 text-gray-700" />
                        </button>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between py-2">
                        <button
                            onClick={() => setCarryOversEnabled(!carryOversEnabled)}
                            className="flex items-center gap-2 px-3 py-2 rounded bg-gray-50 border border-gray-200 active:scale-95 transition-all w-full justify-center"
                        >
                            {carryOversEnabled ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                            <span className="text-[15pt] font-bold text-gray-700">Carry Overs</span>
                        </button>
                    </div>

                    {/* Player Selection & Summary List */}
                    <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between py-1">
                            <span className="text-[15pt] font-bold text-gray-900">Players ({activePlayers.length})</span>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-gray-100 pt-2 pb-2">
                            {potentialPlayers.map(p => {
                                const isSelected = participantIds.includes(p.id);
                                const stats = results?.playerTotals[p.id];
                                const mySkins = stats?.skins || 0;

                                // "Fast Way" Formula: Net = (Player's Skins * Total Players) - Total Skins Won by Group
                                const totalSkins = activePlayers.reduce((sum, ap) => sum + (results?.playerTotals[ap.id]?.skins || 0), 0);
                                const net = (mySkins * activePlayers.length) - totalSkins;

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleToggle(p.id)}
                                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-white border-green-500 shadow-sm' : 'bg-gray-50 border-transparent opacity-60'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 flex items-center justify-center rounded border ${isSelected ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'}`}>
                                                {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                                            </div>
                                            <span className={`text-[15pt] font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{p.name}</span>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center">
                                                <div className="w-28 text-right">
                                                    <span className={`text-[15pt] font-black ${mySkins > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {mySkins} {mySkins === 1 ? 'Skin' : 'Skins'}
                                                    </span>
                                                </div>
                                                <div className="w-16 text-right">
                                                    <span className={`text-[15pt] font-black ${net > 0 ? 'text-green-600' : (net < 0 ? 'text-red-500' : 'text-gray-400')}`}>
                                                        {net > 0 ? '+' : ''}{net}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                        </div>
                    </div>
                </div>

                {/* Scoreboard - Transposed (Holes as Rows) */}
                {results && (
                    <div className="overflow-x-auto pb-4">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-10 bg-gray-50 p-2 border-b border-gray-200 min-w-[3rem] text-center">
                                        <span className="text-[15pt] font-black text-gray-500">H</span>
                                    </th>
                                    {activePlayers.map(p => (
                                        <th key={p.id} className="p-2 border-b border-gray-200 min-w-[5rem] text-center bg-white">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[15pt] font-bold text-gray-900 whitespace-nowrap">{p.name.split(' ')[0]}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {holes.map((h, i) => {
                                    const res = results.holeResults.find(r => r.holeNumber === h.number);
                                    // Determine row styling based on skin status
                                    const hasWinner = !!res?.winnerId;

                                    return (
                                        <tr key={h.number} className="border-b border-gray-100">
                                            {/* Hole Number */}
                                            <td className="sticky left-0 z-10 bg-gray-50 p-2 border-r border-gray-200 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[15pt] font-black ${hasWinner ? 'text-gray-900' : 'text-gray-400'}`}>{h.number}</span>
                                                    <span className="text-[12pt] font-normal text-gray-400">Par {h.par}</span>
                                                </div>
                                            </td>

                                            {/* Player Scores */}
                                            {activePlayers.map(p => {
                                                const isWinner = res?.winnerId === p.id;
                                                const isUltimateWinner = res?.ultimateWinnerId === p.id;
                                                const gross = p.scores[h.number];
                                                const strokes = results.playerStrokes[p.id]?.[h.number] || 0;
                                                const net = gross ? gross - strokes : undefined;

                                                const winnerBorderClass = isWinner
                                                    ? 'border-2 border-red-500 bg-red-50/50'
                                                    : (isUltimateWinner ? 'border-2 border-green-500 bg-green-50/50' : '');

                                                const highlightClass = isWinner
                                                    ? 'text-gray-900 underline decoration-red-600 decoration-4 underline-offset-4'
                                                    : (isUltimateWinner ? 'text-gray-900 underline decoration-green-600 decoration-4 underline-offset-4' : 'text-gray-900');

                                                return (
                                                    <td key={p.id} className={`p-1 text-center border-r border-gray-50 ${(isWinner || isUltimateWinner) ? 'bg-yellow-50' : ''}`}>
                                                        <div className={`flex flex-col items-center justify-center min-w-[3.2rem] min-h-[3.2rem] rounded-full transition-all ${winnerBorderClass}`}>
                                                            {net !== undefined ? (
                                                                <>
                                                                    <span className={`text-[15pt] font-black leading-none ${highlightClass}`}>
                                                                        {net}
                                                                    </span>
                                                                    <span className="text-[12pt] text-gray-400 leading-none mt-1">
                                                                        {gross}
                                                                        {strokes > 0 && (
                                                                            <span className="ml-1 text-[11pt] text-gray-500 font-bold">
                                                                                /-{strokes}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[15pt] text-gray-200">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                {/* Totals Row */}
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td className="sticky left-0 z-10 bg-gray-50 p-2 border-r border-gray-200 text-center">
                                        <span className="text-[15pt] font-black text-gray-900">TOT</span>
                                    </td>
                                    {activePlayers.map(p => (
                                        <td key={p.id} className="p-2 text-center border-r border-gray-200">
                                            <div className="flex flex-col">
                                                <span className="text-[15pt] font-black text-green-700">{results.playerTotals[p.id]?.skins || 0}</span>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
