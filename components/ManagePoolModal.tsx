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
        <div className="fixed inset-0 z-[200] bg-white p-1">
            <div className="bg-white w-full h-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-1 py-5 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc] relative">
                    <h2 className="text-[14pt] font-black text-gray-800 tracking-tight ml-1 mt-2">Manage Front, Back and Total:</h2>
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

                {/* Body - Player Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => setSelectedIds(allPlayers.map(p => p.id))}
                            className="text-[14pt] font-black text-green-600 hover:text-green-700 transition-colors uppercase tracking-widest italic"
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-[14pt] font-black text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest italic"
                        >
                            Uncheck All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sortedPlayers.map(player => {
                            const isSelected = selectedIds.includes(player.id);
                            return (
                                <button
                                    key={player.id}
                                    onClick={() => togglePlayer(player.id)}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-green-500 bg-green-50 shadow-sm'
                                        : 'border-gray-100 bg-white hover:border-gray-200'
                                        } cursor-pointer`}
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
                <div className="p-6 bg-[#f8fafc] border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full py-5 rounded-2xl text-[18pt] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${JSON.stringify(selectedIds.slice().sort()) !== JSON.stringify(initialSelectedIds.slice().sort())
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-black text-white hover:bg-gray-800'
                            }`}
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
                </div>
            </div>
        </div>
    );
}
