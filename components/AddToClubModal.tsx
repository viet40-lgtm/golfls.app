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
        <div className="fixed inset-0 bg-white z-[200] p-1">
            <div className="bg-white w-full h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white p-4 border-b border-gray-200 relative">
                    <div className="flex justify-between items-center">
                        <h2 className="text-[18pt] font-bold text-black text-left ml-1 mt-2">Add to Club Scores</h2>
                        <button
                            onClick={onClose}
                            className="absolute top-2 right-2 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-800 transition-all z-50"
                            title="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <p className="text-gray-600 text-[12pt] mt-1 ml-1">
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

                {/* Footer */}
                <div className="border-t-2 border-gray-200 p-4 bg-gray-50 rounded-b-xl">
                    <div className="flex gap-3">

                        <button
                            onClick={handleSave}
                            disabled={selectedIds.size === 0 || isSaving}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-full text-[15pt] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : `Save to Club (${selectedIds.size})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
