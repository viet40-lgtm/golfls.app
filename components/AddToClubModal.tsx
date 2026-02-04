'use client';

import { useState } from 'react';

interface Player {
    id: string;
    name: string;
    isGuest?: boolean;
    liveRoundPlayerId?: string;
    thru?: string | number;
    totalGross?: number;
    totalNet?: number;
}

interface AddToClubModalProps {
    isOpen: boolean;
    onClose: () => void;
    players: Player[];
    liveRoundId: string;
    onSave: (selectedPlayerIds: string[]) => Promise<void>;
}

export default function AddToClubModal({ isOpen, onClose, players, liveRoundId, onSave }: AddToClubModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    // Filter out guest players (they can't be added to club)
    const eligiblePlayers = players.filter(p => !p.isGuest);

    const togglePlayer = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (eligiblePlayers.length === 0) return;

        if (selectedIds.size === eligiblePlayers.length && eligiblePlayers.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(eligiblePlayers.map(p => p.id)));
        }
    };

    const handleSave = async () => {
        if (selectedIds.size === 0) {
            alert('Please select at least one player');
            return;
        }

        setIsSaving(true);
        try {
            // Map selected IDs to LiveRoundPlayer IDs
            const liveRoundPlayerIds = Array.from(selectedIds).map(id => {
                const player = eligiblePlayers.find(p => p.id === id);
                return player?.liveRoundPlayerId || id; // Fallback to id if liveRoundPlayerId not found
            });

            await onSave(liveRoundPlayerIds);
            setSelectedIds(new Set());
            onClose();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const splitName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return { first: parts[0], last: '' };
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return { first, last };
    };

    return (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col">
            {/* Header */}
            <div className="flex-none bg-gradient-to-r from-blue-600 to-blue-700 p-4 safe-top">
                <div className="flex justify-between items-center">
                    <h2 className="text-[18pt] font-bold text-white text-left ml-3">Add to Club Scores</h2>
                    <button
                        onClick={onClose}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 transition-colors font-bold text-[15pt]"
                    >
                        Close
                    </button>
                </div>
                <p className="text-white/90 text-[12pt] mt-1 ml-3">
                    Select players to copy their scores to the main club scores page
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {eligiblePlayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-[14pt]">No eligible players found</p>
                        <p className="text-[12pt] mt-2">Guest players cannot be added to club scores</p>
                    </div>
                ) : (
                    <>
                        {/* Select All */}
                        <div className="mb-4 pb-3 border-b-2 border-gray-200">
                            <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === eligiblePlayers.length}
                                    onChange={toggleAll}
                                    className="w-6 h-6 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="font-bold text-[16pt] text-gray-900">
                                    Select All ({eligiblePlayers.length})
                                </span>
                            </label>
                        </div>

                        {/* Player List */}
                        <div className="space-y-2">
                            {eligiblePlayers.map(player => {
                                const { first, last } = splitName(player.name);
                                const isSelected = selectedIds.has(player.id);

                                return (
                                    <label
                                        key={player.id}
                                        className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all ${isSelected
                                            ? 'bg-blue-50 border-2 border-blue-500'
                                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => togglePlayer(player.id)}
                                            className="w-6 h-6 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex-1 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-[16pt] text-gray-900">
                                                    {first} <span className="font-normal">{last}</span>
                                                </div>
                                                <div className="text-[12pt] text-gray-600">
                                                    Thru: {player.thru} holes
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[14pt] font-bold text-gray-900">
                                                    Gross: {player.totalGross || '-'}
                                                </div>
                                                <div className="text-[12pt] text-gray-600">
                                                    Net: {player.totalNet || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <div className="border-t-2 border-gray-200 p-4 bg-white sticky bottom-0">
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white text-black border-2 border-black rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selectedIds.size === 0 || isSaving}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed ${selectedIds.size > 0 ? 'bg-blue-600' : 'bg-black'}`}
                    >
                        {isSaving ? 'Saving...' : `Save to Club (${selectedIds.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
}
