'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    index?: number;
    preferred_tee_box?: string | null;
}

interface TeeBox {
    id: string;
    name: string;
    rating: number;
    slope: number;
}

export function LivePlayerSelectionModal({
    allPlayers,
    selectedIds,
    playersInRound = [],
    onSelectionChange,
    isOpen,
    onClose,
    courseData,
    isAdmin = false
}: {
    allPlayers: Player[];
    selectedIds: string[];
    playersInRound?: string[];
    onSelectionChange: (ids: string[]) => void;
    isOpen: boolean;
    onClose: () => void;
    courseData?: {
        courseName: string;
        teeBoxes: TeeBox[];
        par: number;
        roundTeeBox?: {
            rating: number;
            slope: number;
        } | null;
    } | null;
    isAdmin?: boolean;
}) {
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
    const [initialSelection, setInitialSelection] = useState<string[]>([]);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [playerToRemove, setPlayerToRemove] = useState<Player | null>(null);

    const hasChanges = JSON.stringify([...localSelectedIds].sort()) !== JSON.stringify([...initialSelection].sort());

    // Sync local state with prop only when modal opens (not on every dependency change)
    useEffect(() => {
        if (isOpen && !hasInitialized) {
            if (isAdmin) {
                // For Admins: Pre-select everyone who is in the round.
                // This allows the Admin to transparently manage the roster.
                // If they are unchecked, they will be removed.
                const allInRound = Array.from(new Set([...selectedIds, ...playersInRound]));
                setLocalSelectedIds(allInRound);
                setInitialSelection(allInRound);
            } else {
                setLocalSelectedIds(selectedIds);
                setInitialSelection(selectedIds);
            }
            setHasInitialized(true);
        } else if (!isOpen) {
            // Reset initialization flag when modal closes
            setHasInitialized(false);
        }
    }, [isOpen, selectedIds, playersInRound, isAdmin, hasInitialized]);

    if (!isOpen) return null;



    const togglePlayer = (id: string) => {
        setLocalSelectedIds(prev => {
            if (prev.includes(id)) {
                // Determine if we need to warn:
                // Only warn if the player is currently IN the round (playersInRound),
                // because removing them will delete scores.
                // If they are just locally selected but not saved to the round yet, we can mostly just remove them,
                // BUT for consistency with the "remove all trace" model, let's warn if they were passed in as already selected.

                // For simplicity: If unchecking, show warning.
                const player = allPlayers.find(p => p.id === id);
                if (player) {
                    setPlayerToRemove(player);
                }
                return prev; // Don't change yet
            } else {
                return [...prev, id];
            }
        });
    };

    const confirmRemove = () => {
        if (playerToRemove) {
            setLocalSelectedIds(prev => prev.filter(p => p !== playerToRemove.id));
            setPlayerToRemove(null);
        }
    };

    const cancelRemove = () => {
        setPlayerToRemove(null);
    };

    const handleConfirm = () => {
        onSelectionChange(localSelectedIds);
        onClose();
    };

    // Sort players by last name
    const sortedPlayers = [...allPlayers].sort((a, b) => {
        const aLastName = a.name.split(' ').pop() || a.name;
        const bLastName = b.name.split(' ').pop() || b.name;
        return aLastName.localeCompare(bLastName);
    });

    // Calculate course handicap for a player
    const getCourseHandicap = (player: Player): number | null => {
        if (!player.index || !courseData) return null;

        let teeBox: TeeBox | undefined;

        if (player.preferred_tee_box) {
            // Use player's preferred tee if it exists on this course
            teeBox = courseData.teeBoxes.find(t =>
                t.name.toLowerCase().includes(player.preferred_tee_box!.toLowerCase())
            );
        }

        // For other courses, or if no preference, use the round's selected tee box
        if (!teeBox && courseData.roundTeeBox) {
            teeBox = courseData.teeBoxes.find(t =>
                Math.abs(t.rating - courseData.roundTeeBox!.rating) < 0.1 &&
                Math.abs(t.slope - courseData.roundTeeBox!.slope) < 0.1
            );
        }

        // Fallback to white tee or first available
        if (!teeBox) {
            teeBox = courseData.teeBoxes.find(t => t.name.toLowerCase().includes('white')) || courseData.teeBoxes[0];
        }

        if (!teeBox) return null;

        // Course Handicap = (Handicap Index × Slope Rating / 113) + (Course Rating - Par)
        const courseHandicap = (player.index * teeBox.slope / 113) + (teeBox.rating - courseData.par);
        return Math.round(courseHandicap);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">

                {/* Warning Modal Overlay */}
                {playerToRemove && (
                    <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-red-100 transform scale-100 animate-in zoom-in duration-150">
                            <h3 className="text-xl font-black text-red-600 mb-2">Warning: Remove Player?</h3>
                            <p className="text-gray-700 mb-6 text-lg leading-snug">
                                You are removing <span className="font-bold">{playerToRemove.name}</span>.
                                <br /><br />
                                This will <span className="font-bold text-red-600">delete all their scores</span> from this round.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={cancelRemove}
                                    className="px-5 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRemove}
                                    className="px-5 py-3 rounded-xl font-bold bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete Player
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="px-6 py-5 bg-white border-b border-gray-100 flex justify-between items-center relative">
                    <h2 className="text-[14pt] font-black text-gray-800 tracking-tight ml-3">Select Players in My Group</h2>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 mr-2"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Body - Player Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sortedPlayers.map(player => {
                            const isSelected = localSelectedIds.includes(player.id);
                            const isInRound = playersInRound.includes(player.id);
                            const itIsMe = selectedIds.includes(player.id);
                            // Admin can toggle anyone. Non-admins can only toggle people not in round, or people they have already claimed.
                            // UPDATE: Any device can now toggle any player to claim/unclaim them.
                            // const isDisabled = !isAdmin && isInRound && !itIsMe;

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => togglePlayer(player.id)}
                                    // disabled={isDisabled}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-sm cursor-pointer'
                                        : 'border-gray-100 bg-white hover:border-gray-200 cursor-pointer'
                                        }`}
                                >
                                    <div className={`w-8 h-8 shrink-0 rounded flex items-center justify-center border-2 transition-colors ${isSelected
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'bg-white border-gray-300'
                                        }`}>
                                        {isSelected && (
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[18pt] font-bold ${isSelected ? 'text-blue-800' : 'text-gray-700'
                                                }`}>
                                                {player.name}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {/* Badge Removed per user request */}
                                                {/* Course Handicap */}
                                                {(() => {
                                                    const courseHcp = getCourseHandicap(player);
                                                    return courseHcp !== null && (
                                                        <span className="text-[14pt] font-semibold text-gray-600">
                                                            ({courseHcp})
                                                        </span>
                                                    );
                                                })()}
                                                {/* Tee Box Indicator */}
                                                {player.preferred_tee_box && (
                                                    <span className={`px-2 py-0.5 rounded text-[12pt] font-bold ${player.preferred_tee_box.toLowerCase().includes('white')
                                                        ? 'bg-white text-black border border-black'
                                                        : player.preferred_tee_box.toLowerCase().includes('gold')
                                                            ? 'bg-yellow-400 text-black'
                                                            : 'bg-gray-300 text-gray-700'
                                                        }`}>
                                                        {player.preferred_tee_box.toLowerCase().includes('white')
                                                            ? 'W'
                                                            : player.preferred_tee_box.toLowerCase().includes('gold')
                                                                ? 'G'
                                                                : player.preferred_tee_box.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white border-t border-gray-100 flex w-full sticky bottom-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4">
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 ${hasChanges ? 'bg-[#04d361] hover:bg-[#04b754]' : 'bg-black hover:bg-gray-800'} text-white py-3 rounded-full text-[16pt] font-black uppercase tracking-widest transition-all active:brightness-95 flex items-center justify-center gap-2 cursor-pointer`}
                    >
                        Save ({localSelectedIds.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
