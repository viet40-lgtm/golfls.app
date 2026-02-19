'use client';

import { useState, useEffect, useRef } from 'react';
import { updatePoolParticipants } from '@/app/actions';
import { X } from 'lucide-react';
import Cookies from 'js-cookie';

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
    onUpdate
}: {
    roundId: string;
    allPlayers: Player[];
    initialSelectedIds: string[];
    isOpen: boolean;
    onClose: () => void;
    isAdmin?: boolean; // kept for API compat but we read cookie directly
    onUpdate?: () => void;
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
    const [isSaving, setIsSaving] = useState(false);
    // Read admin status directly from cookie — don't rely on prop timing
    const isAdmin = Cookies.get('admin_session') === 'true';

    // Sync state only when the modal opens
    const wasOpen = useRef(false);
    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setSelectedIds(initialSelectedIds);
        }
        wasOpen.current = isOpen;
    });

    if (!isOpen) return null;

    const togglePlayer = (id: string) => {
        if (!isAdmin) return;
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePoolParticipants(roundId, selectedIds);
            // Targeted reload to ensure we stay on the current live round URL if present
            if (onUpdate) {
                onUpdate();
            }
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(`Failed to update players: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Sort players by name
    const sortedPlayers = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));

    // Check if selections have changed from initial
    const hasChanges = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...initialSelectedIds].sort());

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]">
                    <h2 className="text-[14pt] font-black text-gray-800 tracking-tight">Manage Pool Participants</h2>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Body - Player Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isAdmin && (
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setSelectedIds(allPlayers.map(p => p.id))}
                                className="text-[14pt] font-bold text-green-600 hover:text-green-700 transition-colors p-1 rounded-full"
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="text-[14pt] font-bold text-red-600 hover:text-red-700 transition-colors p-1 rounded-full"
                            >
                                Uncheck All
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sortedPlayers.map(player => {
                            const isSelected = selectedIds.includes(player.id);
                            // console.log(`Rendering player ${player.name} (${player.id}), isSelected: ${isSelected}`);
                            return (
                                <button
                                    key={player.id}
                                    onClick={() => {
                                        console.log(`Toggling player: ${player.name} (${player.id})`);
                                        togglePlayer(player.id);
                                    }}
                                    disabled={!isAdmin}
                                    className={`flex items-center gap-4 p-1 rounded-full border-2 transition-all text-left ${isSelected
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
                <div className="bg-white border-t border-gray-100 flex w-full sticky bottom-0 p-4">
                    {isAdmin ? (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex-1 ${hasChanges ? 'bg-[#04d361] hover:bg-[#04b754]' : 'bg-black hover:bg-gray-800'} text-white p-1 rounded-full text-[18pt] font-black uppercase tracking-widest transition-all active:brightness-95 flex items-center justify-center gap-2 cursor-pointer min-h-[60px]`}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Saving...
                                </>
                            ) : (
                                'Save Pool'
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="flex-1 bg-black text-white p-1 rounded-full text-[15pt] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95 cursor-pointer min-h-[60px]"
                            disabled={isSaving}
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
