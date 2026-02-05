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
    const [deletePassword, setDeletePassword] = useState('');
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
        showInput?: boolean;
        inputPlaceholder?: string;
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
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in fade-in duration-200">
            {/* Header (Rule #1) */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="w-10"></div>
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-center flex-1">
                    {editingGuest ? 'Edit Guest' : 'Add Guest'}
                </h2>
                <div className="w-10"></div>
            </div>

            <div className="space-y-4 p-4 flex-1 overflow-y-auto">
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

            <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white flex flex-col gap-3 z-20">
                {editingGuest && (
                    <button
                        onClick={() => {
                            setDeletePassword('');
                            setConfirmConfig({
                                isOpen: true,
                                title: 'Password Required',
                                message: 'Enter password to delete this guest:',
                                showInput: true,
                                inputPlaceholder: 'Password',
                                onConfirm: () => { }
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
                        className="flex-1 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
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

            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDestructive={confirmConfig.isDestructive}
                    showInput={confirmConfig.showInput}
                    inputPlaceholder={confirmConfig.inputPlaceholder}
                    inputValue={deletePassword}
                    onInputChange={setDeletePassword}
                    onConfirm={() => {
                        if (confirmConfig.showInput) {
                            if (deletePassword === 'cpgc-Delete') {
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
                            } else {
                                setConfirmConfig({
                                    isOpen: true,
                                    title: 'Error',
                                    message: 'Incorrect password.',
                                    onConfirm: () => setConfirmConfig(null)
                                });
                            }
                        } else {
                            confirmConfig.onConfirm();
                        }
                    }}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}
