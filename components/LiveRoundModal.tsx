'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLiveRound, updateLiveRound, addPlayerToLiveRound } from '@/app/actions/create-live-round';

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
        courseId?: string;
    } | null;
    allCourses?: any[]; // Using any[] for simplicity or define full type
    showAlert: (title: string, message: string) => void;
    defaultTeeBoxId?: string;
    currentUserId?: string;
}

export function LiveRoundModal({
    isOpen,
    onClose,
    courseId,
    existingRound,
    allCourses = [],
    showAlert,
    defaultTeeBoxId,
    currentUserId
}: LiveRoundModalProps) {
    const router = useRouter();
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localToday = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    const today = localToday;

    const [name, setName] = useState('');
    const [date, setDate] = useState(today);
    const [par, setPar] = useState(68);
    const [rating, setRating] = useState(63.8);
    const [slope, setSlope] = useState(100);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedTeeId, setSelectedTeeId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingRound) {
                // Edit Mode: Populating from existing round
                setName(existingRound.name);
                setDate(existingRound.date);
                setPar(existingRound.par);
                setRating(existingRound.rating);
                setSlope(existingRound.slope);
                setSelectedCourseId(existingRound.courseId || '');

                // Find the course to find its tees
                const course = allCourses.find(c => c.id === existingRound.courseId);
                if (course) {
                    // Try to find the tee box that matches the round's rating/slope
                    const matchingTee = course.teeBoxes.find((t: any) =>
                        Math.abs(t.rating - existingRound.rating) < 0.1 &&
                        t.slope === existingRound.slope
                    );
                    if (matchingTee) {
                        setSelectedTeeId(matchingTee.id);
                    }
                }
            } else {
                // New Mode: Populating from defaults/props
                const cpNorth = allCourses.find(c => c.name.toLowerCase().includes('city park north'));
                const initialCourse = cpNorth || allCourses.find(c => c.id === courseId) || allCourses[0];

                if (initialCourse) {
                    setSelectedCourseId(initialCourse.id);
                    setName(initialCourse.name);
                    setDate(today);

                    // Find White tee or first available (or defaultTeeBoxId if provided)
                    const whiteTee = initialCourse.teeBoxes.find((t: any) => t.name.toLowerCase().includes('white'));
                    const defaultTee = defaultTeeBoxId ? initialCourse.teeBoxes.find((t: any) => t.id === defaultTeeBoxId) : null;
                    const initialTee = defaultTee || whiteTee || initialCourse.teeBoxes[0];

                    if (initialTee) {
                        setSelectedTeeId(initialTee.id);
                        setRating(initialTee.rating);
                        setSlope(initialTee.slope);
                    }

                    // Calculate par
                    if (initialCourse.holes?.length) {
                        const calcPar = initialCourse.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                        setPar(calcPar);
                    } else {
                        setPar(68);
                    }
                }
            }
        }
    }, [isOpen, today, courseId, allCourses, existingRound, defaultTeeBoxId]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const parVal = parseInt(par.toString()) || (existingRound?.par || 68);
        const ratingVal = parseFloat(rating.toString()) || (existingRound?.rating || 63.8);
        const slopeVal = parseInt(slope.toString()) || (existingRound?.slope || 100);

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

                // 1. Create the Round
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

                    // 2. Add Current User (Best Effort)
                    if (currentUserId) {
                        try {
                            const c = allCourses.find(c => c.id === cId);
                            // Determine best tee: Selected -> Default Prop -> White -> First Available
                            let targetTeeId = selectedTeeId;

                            if (!targetTeeId && c) {
                                const white = c.teeBoxes.find((t: any) => t.name.toLowerCase().includes('white'));
                                const def = defaultTeeBoxId ? c.teeBoxes.find((t: any) => t.id === defaultTeeBoxId) : null;
                                targetTeeId = def?.id || white?.id || c.teeBoxes[0]?.id;
                            }

                            if (targetTeeId) {
                                await addPlayerToLiveRound({
                                    liveRoundId: result.liveRoundId,
                                    playerId: currentUserId,
                                    teeBoxId: targetTeeId
                                });

                                // Local storage sync
                                const saved = localStorage.getItem(`live_scoring_my_group_${result.liveRoundId}`);
                                let currentIds: string[] = saved ? JSON.parse(saved) : [];
                                if (!currentIds.includes(currentUserId)) {
                                    currentIds.push(currentUserId);
                                    localStorage.setItem(`live_scoring_my_group_${result.liveRoundId}`, JSON.stringify(currentIds));
                                }
                            }
                        } catch (addPlayerError) {
                            console.error("Failed to auto-add player, but round was created:", addPlayerError);
                            // We do NOT stop here, we still want to redirect to the valid round
                        }
                    }

                    onClose();
                    router.replace(`/live?roundId=${result.liveRoundId}`);
                    // Force a hard refresh to ensure state is clean
                    setTimeout(() => {
                        window.location.href = `/live?roundId=${result.liveRoundId}`;
                    }, 500);

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
        <div className="fixed inset-0 z-[200] bg-white p-1">
            <div className="bg-white w-full h-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-1 bg-white text-black flex justify-between items-center shrink-0 border-b border-gray-100 relative">
                    <h2 className="text-[16pt] font-bold text-left ml-1 mt-2">{existingRound ? 'Edit Live Round' : 'New Live Round'}</h2>
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

                {/* Body */}
                <div className="p-1 space-y-3 flex-1 overflow-y-auto">
                    <div>
                        <label htmlFor="round-date" className="block text-[12pt] font-bold text-gray-700 mb-1">Date</label>
                        <input
                            id="round-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] outline-none text-black bg-gray-100 cursor-not-allowed"
                        />
                    </div>

                    {/* Course Selection */}
                    <div>
                        <label htmlFor="round-course" className="block text-[12pt] font-bold text-gray-700 mb-1">Course</label>
                        <select
                            id="round-course"
                            value={selectedCourseId}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setSelectedCourseId(newId);
                                setSelectedTeeId(''); // Reset tee on course change
                                const c = allCourses.find(fc => fc.id === newId);
                                if (c) {
                                    setName(c.name);
                                    // Default to first tee box or White if available
                                    const whiteTee = c.teeBoxes.find((t: any) => t.name.toLowerCase().includes('white'));
                                    const devTee = whiteTee || c.teeBoxes[0];

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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none text-black bg-white"
                        >
                            <option value="" disabled>-- Select Course --</option>
                            {allCourses?.map(c => (
                                <option key={c.id} value={c.id}>{c.name.replace(/New Orleans/gi, '').trim()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tee Box Selection (Helper for auto-filling) */}
                    <div>
                        <label htmlFor="round-teebox" className="block text-[12pt] font-bold text-gray-700 mb-1">Select Tee Box (Auto-fill)</label>
                        <select
                            id="round-teebox"
                            value={selectedTeeId}
                            onChange={(e) => {
                                const tId = e.target.value;
                                setSelectedTeeId(tId);
                                const c = allCourses.find(fc => fc.id === selectedCourseId);
                                if (c) {
                                    const tee = c.teeBoxes.find((t: any) => t.id === tId);
                                    if (tee) {
                                        setRating(tee.rating);
                                        setSlope(tee.slope);
                                        const cPar = c.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                        setPar(cPar || par);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none text-black bg-white"
                        >
                            <option value="" disabled>-- Select Tee Box --</option>
                            {allCourses.find(c => c.id === selectedCourseId)?.teeBoxes.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} (R: {t.rating} / S: {t.slope})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="round-par" className="block text-[12pt] font-bold text-gray-700 mb-1">Par</label>
                            <input
                                id="round-par"
                                type="number"
                                value={par}
                                onChange={(e) => setPar(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none text-black bg-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="round-rating" className="block text-[12pt] font-bold text-gray-700 mb-1">Rating</label>
                            <input
                                id="round-rating"
                                type="number"
                                step="0.1"
                                value={rating}
                                onChange={(e) => setRating(parseFloat(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none text-black bg-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="round-slope" className="block text-[12pt] font-bold text-gray-700 mb-1">Slope</label>
                            <input
                                id="round-slope"
                                type="number"
                                value={slope}
                                onChange={(e) => setSlope(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none text-black bg-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-1 bg-gray-50 flex justify-end gap-2 mt-1 shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-full text-[13pt] font-bold shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors ${!existingRound ||
                            name !== existingRound.name ||
                            date !== existingRound.date ||
                            par !== existingRound.par ||
                            rating !== existingRound.rating ||
                            slope !== existingRound.slope ||
                            selectedCourseId !== (existingRound.courseId || '')
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-black text-white hover:bg-gray-800'
                            }`}
                    >
                        {isSaving ? 'Saving...' : (existingRound ? 'Save Round' : 'Start Round')}
                    </button>
                </div>
            </div>
        </div>
    );
}
