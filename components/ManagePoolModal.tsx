'use client';

import { useState } from 'react';
import { updatePoolParticipants } from '@/app/actions';

interface Player {
    id: string;
    name: string;
}

export function ManagePoolModal({
    roundId,
    allPlayers, // These are now ONLY players in the round
    initialSelectedIds,
    isOpen,
    onClose,
    isAdmin
}: {
    roundId: string;
    allPlayers: Player[];
    initialSelectedIds: string[];
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const togglePlayer = (id: string) => {
        if (!isAdmin) return; // Only admins can toggle
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePoolParticipants(roundId, selectedIds);
            onClose();
            window.location.reload();
        } catch (err: any) {
            console.error(err);
            alert(`Failed to update players: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Sort players by name
    const sortedPlayers = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));

    const isDirty = () => {
        if (selectedIds.length !== initialSelectedIds.length) return true;
        const sortedSelected = [...selectedIds].sort();
        const sortedInitial = [...initialSelectedIds].sort();
        return JSON.stringify(sortedSelected) !== JSON.stringify(sortedInitial);
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white overflow-hidden animate-in fade-in duration-200">

            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div className="w-10"></div>
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-center flex-1">Manage Pool Participants</h2>
                <div className="w-10"></div>
            </div>

            {/* Body - Player Grid */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {isAdmin && (
                    <div className="flex gap-4 mb-6 px-1">
                        <button
                            onClick={() => setSelectedIds(allPlayers.map(p => p.id))}
                            className="text-[12pt] font-black text-blue-600 uppercase tracking-widest hover:opacity-70 transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-[12pt] font-black text-red-600 uppercase tracking-widest hover:opacity-70 transition-colors"
                        >
                            Uncheck All
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                    {sortedPlayers.map(player => {
                        const isSelected = selectedIds.includes(player.id);
                        return (
                            <button
                                key={player.id}
                                onClick={() => togglePlayer(player.id)}
                                disabled={!isAdmin}
                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${isSelected
                                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                                    : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'
                                    } ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-colors ${isSelected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white border-gray-300'
                                    }`}>
                                    {isSelected && (
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    )}
                                </div>
                                <span className={`text-[14pt] font-black uppercase tracking-tight ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                    {player.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                        disabled={isSaving}
                    >
                        {isAdmin ? 'Cancel' : 'Close'}
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-white ${isDirty() ? 'bg-blue-600' : 'bg-black'}`}
                        >
                            {isSaving ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
