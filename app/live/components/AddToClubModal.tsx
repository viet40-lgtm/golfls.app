'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    isGuest?: boolean;
    liveRoundPlayerId?: string;
    thru?: number;
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
            <div className="w-full flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 relative">
                    <div className="flex justify-between items-center pr-12">
                        <h2 className="text-[20pt] font-black text-white text-left ml-3 uppercase tracking-tight">Transfer to club scores:</h2>
                    </div>
                    <p className="text-white/90 text-[14pt] mt-1 ml-3 font-medium">
                        Select players to copy their scores to the main club scores page
                    </p>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="absolute right-6 top-6 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 z-50"
                    >
                        <X className="w-8 h-8" />
                    </button>
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
                <div className="bg-white border-t border-gray-100 flex w-full sticky bottom-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={handleSave}
                        disabled={selectedIds.size === 0 || isSaving}
                        className={`flex-1 ${selectedIds.size > 0 ? 'bg-[#04d361] hover:bg-[#04b754]' : 'bg-black hover:bg-gray-800'} text-white p-1 rounded-full text-[18pt] font-black uppercase tracking-widest transition-all active:brightness-95 flex items-center justify-center gap-2 cursor-pointer min-h-[60px]`}
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Saving...
                            </>
                        ) : (
                            `Save (${selectedIds.size})`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
