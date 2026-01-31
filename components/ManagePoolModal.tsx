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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-1 py-5 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]">
                    <h2 className="text-[14pt] font-black text-gray-800 tracking-tight">Manage Pool Participants</h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>

                {/* Body - Player Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isAdmin && (
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setSelectedIds(allPlayers.map(p => p.id))}
                                className="text-[14pt] font-bold text-green-600 hover:text-green-700 transition-colors"
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="text-[14pt] font-bold text-red-600 hover:text-red-700 transition-colors"
                            >
                                Uncheck All
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sortedPlayers.map(player => {
                            const isSelected = selectedIds.includes(player.id);
                            return (
                                <button
                                    key={player.id}
                                    onClick={() => togglePlayer(player.id)}
                                    disabled={!isAdmin}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-green-500 bg-green-50 shadow-sm'
                                        : 'border-gray-100 bg-white hover:border-gray-200'
                                        } ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                >
                                    <div className={`w-7 h-7 rounded flex items-center justify-center border-2 transition-colors ${isSelected
                                        ? 'bg-green-600 border-green-600'
                                        : 'bg-white border-gray-300'
                                        }`}>
                                        {isSelected && (
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </div>
                                    <span className={`text-[14pt] font-bold ${isSelected ? 'text-green-800' : 'text-gray-700'}`}>
                                        {player.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-1 py-5 bg-[#f8fafc] border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-[15pt] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                        disabled={isSaving}
                    >
                        {isAdmin ? 'Cancel' : 'Close'}
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#04d361] hover:bg-[#04b754] text-white px-4 py-2 rounded-xl text-[15pt] font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Saving...
                                </>
                            ) : (
                                'Save Pool Participants'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
