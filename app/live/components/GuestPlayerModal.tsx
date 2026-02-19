'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
    const [index, setIndex] = useState('');
    const [courseHandicap, setCourseHandicap] = useState('');
    const [manuallyEditedHandicap, setManuallyEditedHandicap] = useState(false);

    const [initialName, setInitialName] = useState('');
    const [initialIndex, setInitialIndex] = useState('');
    const [initialCourseHandicap, setInitialCourseHandicap] = useState('');

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    } | null>(null);

    const hasChanges = editingGuest
        ? name !== initialName || index !== initialIndex || courseHandicap !== initialCourseHandicap
        : name.trim() !== '' || index !== '';

    // Load editing guest data when modal opens
    useEffect(() => {
        if (editingGuest) {
            setName(editingGuest.name);
            setIndex(editingGuest.index.toString());
            setCourseHandicap(editingGuest.courseHandicap.toString());
            setInitialName(editingGuest.name);
            setInitialIndex(editingGuest.index.toString());
            setInitialCourseHandicap(editingGuest.courseHandicap.toString());
            setManuallyEditedHandicap(false);
        } else {
            setName('');
            setIndex('');
            setCourseHandicap('');
            setInitialName('');
            setInitialIndex('');
            setInitialCourseHandicap('');
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
    }, [index, roundData, editingGuest, manuallyEditedHandicap]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Please enter a name');
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
        setIndex('');
        setCourseHandicap('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 flex justify-between items-center px-6 py-5 relative">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[14pt] font-black text-gray-800 tracking-tight ml-3">
                            {editingGuest ? 'Edit Guest' : 'Add Guest'}
                        </h2>
                        {editingGuest && (
                            <button
                                onClick={() => {
                                    const password = prompt("Enter password to delete:");
                                    if (password !== 'cpgc-Delete') {
                                        alert('Incorrect password.');
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
                                className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10pt] font-bold hover:bg-red-100 transition-colors"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 mr-2"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                            placeholder="Guest Name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Handicap Index
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={index}
                            onChange={(e) => setIndex(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Course Handicap {roundData && !editingGuest && !manuallyEditedHandicap && <span className="text-xs text-gray-500">(Auto-calculated)</span>}
                        </label>
                        <input
                            type="number"
                            value={courseHandicap}
                            onChange={(e) => {
                                setCourseHandicap(e.target.value);
                                setManuallyEditedHandicap(true);
                            }}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                        />
                        {roundData && !editingGuest && (
                            <p className="text-xs text-gray-500 mt-1">
                                Based on Rating: {roundData.rating}, Slope: {roundData.slope}, Par: {roundData.par}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-gray-100 flex w-full mt-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={handleSubmit}
                        className={`flex-1 ${hasChanges ? 'bg-[#04d361] hover:bg-[#04b754]' : 'bg-black hover:bg-gray-800'} text-white p-1 rounded-full text-[18pt] font-black uppercase tracking-widest transition-all active:brightness-95 flex items-center justify-center gap-2 cursor-pointer min-h-[60px]`}
                    >
                        {editingGuest ? 'Update Guest' : 'Add Guest'}
                    </button>
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
