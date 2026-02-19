'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createLiveRound, updateLiveRound } from '../actions/create-live-round';

interface LiveRoundModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string;
    existingRound?: {
        id: string;
        name: string;
        date: string;
        par: number;
        rating: number;
        slope: number;
        course_id?: string;
    } | null;
    allCourses?: any[]; // Using any[] for simplicity or define full type
    showAlert: (title: string, message: string) => void;
}

export function LiveRoundModal({
    isOpen,
    onClose,
    courseId,
    existingRound,
    allCourses = [],
    showAlert
}: LiveRoundModalProps) {
    const router = useRouter();
    const today = new Date().toISOString().split('T')[0];

    const [name, setName] = useState('');
    const [date, setDate] = useState(today);
    const [par, setPar] = useState(68);
    const [rating, setRating] = useState(63.8);
    const [slope, setSlope] = useState(100);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedTeeId, setSelectedTeeId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [initialName, setInitialName] = useState('');
    const [initialDate, setInitialDate] = useState('');
    const [initialCourseId, setInitialCourseId] = useState('');

    const hasChanges = name !== initialName || date !== initialDate || selectedCourseId !== initialCourseId;

    useEffect(() => {
        if (isOpen) {
            // Always default to City Park North & White Tee when modal opens
            const cpNorth = allCourses.find(c => c.name.toLowerCase().includes('city park north'));
            const initialCourse = cpNorth || allCourses.find(c => c.id === courseId) || allCourses[0];

            if (initialCourse) {
                setSelectedCourseId(initialCourse.id);
                const roundDate = existingRound?.date || today;
                setDate(roundDate);
                const newName = `${roundDate} - ${initialCourse.name}`;
                setName(newName);

                // Find White tee or first available
                const whiteTee = initialCourse.teeBoxes?.find((t: any) => t.name.toLowerCase().includes('white'));
                const initialTee = whiteTee || initialCourse.teeBoxes?.[0];

                if (initialTee) {
                    setSelectedTeeId(initialTee.id);
                    setRating(initialTee.rating);
                    setSlope(initialTee.slope);
                }

                setInitialName(newName);
                setInitialDate(roundDate);
                setInitialCourseId(initialCourse.id);

                // Calculate par
                if (initialCourse.holes?.length) {
                    const calcPar = initialCourse.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                    setPar(calcPar);
                } else {
                    setPar(68);
                }
            }
        }
    }, [isOpen, today, courseId, allCourses, existingRound]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const parVal = isNaN(par) ? (existingRound?.par || 68) : par;
        const ratingVal = isNaN(rating) ? (existingRound?.rating || 63.8) : rating;
        const slopeVal = isNaN(slope) ? (existingRound?.slope || 100) : slope;

        setIsSaving(true);
        try {
            if (existingRound) {
                const result = await updateLiveRound({
                    id: existingRound.id,
                    name: name || 'Live Round',
                    date: date || today,
                    courseId: selectedCourseId || courseId,
                    par: parVal,
                    rating: ratingVal,
                    slope: slopeVal
                });

                if (result.success) {
                    onClose();
                    // Move to the round without scrolling
                    router.push(`/live?roundId=${existingRound.id}`, { scroll: false });
                    router.refresh();
                } else {
                    showAlert('Error', 'Save Failed: ' + result.error);
                    setIsSaving(false);
                }
            } else {
                const cId = selectedCourseId || courseId;
                if (!cId) {
                    showAlert('Error', 'No Course ID selected.');
                    setIsSaving(false);
                    return;
                }
                const result = await createLiveRound({
                    name: name || 'Live Round',
                    date: date || today,
                    courseId: cId,
                    courseName: allCourses.find((c: any) => c.id === cId)?.name || 'Unknown Course',
                    par: parVal,
                    rating: ratingVal,
                    slope: slopeVal
                });

                if (result.success && result.liveRoundId) {
                    onClose();
                    // Hard reload to ensure page updates with new round
                    window.location.href = `/live?roundId=${result.liveRoundId}`;
                } else {
                    showAlert('Error', 'Creation Failed: ' + (result.error || 'Server Error'));
                    setIsSaving(false);
                }
            }
        } catch (e) {
            console.error('CRASH:', e);
            showAlert('Error', 'A critical error occurred. Please refresh.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 flex justify-between items-center px-6 py-5 relative">
                    <h2 className="text-[14pt] font-black text-gray-800 tracking-tight ml-3 uppercase">
                        {existingRound ? 'Edit Live Round' : 'New Live Round'}
                    </h2>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 mr-2"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Course Selection */}
                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Course</label>
                        <select
                            value={selectedCourseId}
                            title="Course Selection"
                            onChange={(e) => {
                                const newId = e.target.value;
                                setSelectedCourseId(newId);
                                setSelectedTeeId(''); // Reset tee on course change
                                const c = allCourses.find(fc => fc.id === newId);
                                if (c) {
                                    setName(`${date} - ${c.name}`);
                                    // Default to first tee box or White if available
                                    const whiteTee = c.teeBoxes?.find((t: any) => t.name.toLowerCase().includes('white'));
                                    const devTee = whiteTee || c.teeBoxes?.[0];

                                    if (devTee) {
                                        setSelectedTeeId(devTee.id);
                                        setRating(devTee.rating);
                                        setSlope(devTee.slope);
                                    }

                                    if (c.holes?.length) {
                                        const cPar = c.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                        setPar(cPar);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none bg-white"
                        >
                            <option value="" disabled>-- Select Course --</option>
                            {allCourses?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            title="Round Date"
                            onChange={(e) => {
                                const newDate = e.target.value;
                                setDate(newDate);
                                // Update name with new date
                                const currentCourse = allCourses.find(c => c.id === selectedCourseId);
                                if (currentCourse) {
                                    setName(`${newDate} - ${currentCourse.name}`);
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none"
                        />
                    </div>

                    {/* Tee Box Selection */}
                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Tee Box</label>
                        <select
                            value={selectedTeeId}
                            title="Tee Box Selection"
                            onChange={(e) => {
                                const newTeeId = e.target.value;
                                setSelectedTeeId(newTeeId);
                                const currentCourse = allCourses.find(c => c.id === selectedCourseId);
                                if (currentCourse) {
                                    const tee = currentCourse.teeBoxes?.find((t: any) => t.id === newTeeId);
                                    if (tee) {
                                        setRating(tee.rating);
                                        setSlope(tee.slope);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none bg-white"
                        >
                            <option value="" disabled>-- Select Tee Box --</option>
                            {(() => {
                                const currentCourse = allCourses.find(c => c.id === selectedCourseId);
                                return currentCourse?.teeBoxes?.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.rating}/{t.slope})</option>
                                ));
                            })()}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-gray-100 flex w-full sticky bottom-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-1 ${hasChanges ? 'bg-[#04d361] hover:bg-[#04b754]' : 'bg-black hover:bg-gray-800'} text-white py-3 rounded-full text-[16pt] font-black uppercase tracking-widest transition-all active:brightness-95 flex items-center justify-center gap-2 cursor-pointer`}
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Saving...
                            </>
                        ) : (
                            'Save'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
