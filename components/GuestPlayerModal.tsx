'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from './ConfirmModal';

interface GuestPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (guest: { name: string; index: number; courseHandicap: number }) => void;
    onUpdate?: (guestId: string, guest: { name: string; index: number; courseHandicap: number }) => void;
    onDelete?: (guestId: string) => void;
    roundData?: {
        rating: number;
        slope: number;
        par: number;
    } | null;
    editingGuest?: {
        id: string;
        name: string;
        index: number;
        courseHandicap: number;
    } | null;
}

export function GuestPlayerModal({ isOpen, onClose, onAdd, onUpdate, onDelete, roundData, editingGuest }: GuestPlayerModalProps) {
    const [name, setName] = useState('');
    const [index, setIndex] = useState('0');
    const [courseHandicap, setCourseHandicap] = useState('0');
    const [manuallyEditedHandicap, setManuallyEditedHandicap] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    } | null>(null);

    // Load editing guest data when modal opens
    useEffect(() => {
        if (editingGuest) {
            setName(editingGuest.name);
            setIndex(editingGuest.index.toString());
            setCourseHandicap(editingGuest.courseHandicap.toString());
            setManuallyEditedHandicap(false);
        } else {
            setName('');
            setIndex('0');
            setCourseHandicap('0');
            setManuallyEditedHandicap(false);
        }
    }, [editingGuest, isOpen]);

    // Auto-calculate course handicap when index changes (only if not manually edited)
    useEffect(() => {
        if (roundData && index && !editingGuest && !manuallyEditedHandicap) {
            const indexNum = parseFloat(index);
            if (isNaN(indexNum)) return;

            const { rating, slope, par } = roundData;

            // Course Handicap formula: (Index × Slope / 113) + (Rating - Par)
            const calculatedHandicap = Math.round((indexNum * slope / 113) + (rating - par));
            setCourseHandicap(calculatedHandicap.toString());
        }
    }, [index, roundData?.slope, roundData?.rating, roundData?.par, editingGuest, manuallyEditedHandicap]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name.trim()) {
            setConfirmConfig({
                isOpen: true,
                title: 'Error',
                message: 'Please enter a name',
                onConfirm: () => setConfirmConfig(null)
            });
            return;
        }

        const guestData = {
            name: name.trim(),
            index: parseFloat(index) || 0,
            courseHandicap: parseInt(courseHandicap) || 0
        };

        if (editingGuest && onUpdate) {
            onUpdate(editingGuest.id, guestData);
        } else {
            onAdd(guestData);
        }

        // Reset form
        setName('');
        setIndex('0');
        setCourseHandicap('0');
        onClose();
    };

    const isDirty = () => {
        if (!editingGuest) {
            return name.trim() !== '' || index !== '0' || courseHandicap !== '0';
        }
        return name.trim() !== editingGuest.name ||
            parseFloat(index) !== editingGuest.index ||
            parseInt(courseHandicap) !== editingGuest.courseHandicap;
    };

    return (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col p-4 animate-in fade-in duration-200">
            <div className="w-full h-full flex flex-col">
                <div className="flex-none flex items-center justify-between mb-8 safe-top px-4">
                    <div className="w-10"></div>
                    <h2 className="text-[20pt] font-black italic uppercase tracking-tighter text-center flex-1">
                        {editingGuest ? 'Edit Guest' : 'Add Guest'}
                    </h2>
                    <div className="w-10"></div>
                </div>

                <div className="space-y-4 px-4 flex-1 overflow-y-auto">
                    <div>
                        <label className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg text-black"
                            placeholder="Guest Name"
                        />
                    </div>

                    <div>
                        <label className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                            Handicap Index
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={index}
                            onChange={(e) => setIndex(e.target.value)}
                            className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.0"
                        />
                    </div>

                    <div>
                        <label className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                            Course Handicap {roundData && !editingGuest && !manuallyEditedHandicap && <span className="text-xs text-gray-500 lowercase">(Auto-calculated)</span>}
                        </label>
                        <input
                            type="number"
                            value={courseHandicap}
                            onChange={(e) => {
                                setCourseHandicap(e.target.value);
                                setManuallyEditedHandicap(true);
                            }}
                            className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                        />
                        {roundData && !editingGuest && (
                            <p className="text-[10pt] text-gray-400 font-medium px-1 mt-1">
                                Based on R: {roundData.rating}, S: {roundData.slope}, P: {roundData.par}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-6 pb-8 px-4">
                    {editingGuest && (
                        <button
                            onClick={() => {
                                const password = prompt("Enter password to delete:");
                                if (password !== 'cpgc-Delete') {
                                    setConfirmConfig({
                                        isOpen: true,
                                        title: 'Error',
                                        message: 'Incorrect password.',
                                        onConfirm: () => setConfirmConfig(null)
                                    });
                                    return;
                                }
                                setConfirmConfig({
                                    isOpen: true,
                                    title: 'Delete Guest Player',
                                    message: 'Are you sure you want to delete this guest player?',
                                    isDestructive: true,
                                    onConfirm: () => {
                                        setConfirmConfig(null);
                                        if (onDelete && editingGuest) {
                                            onDelete(editingGuest.id);
                                        }
                                    }
                                });
                            }}
                            className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                        >
                            Delete Guest
                        </button>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-white text-black border-2 border-black rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all text-white ${isDirty() ? 'bg-blue-600' : 'bg-black'}`}
                        >
                            {editingGuest ? 'Save Changes' : 'Add Guest'}
                        </button>
                    </div>
                </div>
            </div>
            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDestructive={confirmConfig.isDestructive}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}
