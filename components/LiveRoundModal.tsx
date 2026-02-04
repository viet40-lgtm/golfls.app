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

    const isDirty = () => {
        if (!existingRound) {
            // New round: check if anything differs from defaults
            // Defaults: name = course.name, date = today, par/rating/slope = tee defaults
            // For simplicity, if user changed anything from what was initially loaded
            // We can track initial loaded state or just check if inputs are touched.
            // Let's check if current values differ from the 'initial defaults' logic used in useEffect.

            // Re-calculating what the defaults would be
            const cpNorth = allCourses.find(c => c.name.toLowerCase().includes('city park north'));
            const initialCourse = cpNorth || allCourses.find(c => c.id === courseId) || allCourses[0];
            if (!initialCourse) return false;

            const whiteTee = initialCourse.teeBoxes.find((t: any) => t.name.toLowerCase().includes('white'));
            const defaultTee = defaultTeeBoxId ? initialCourse.teeBoxes.find((t: any) => t.id === defaultTeeBoxId) : null;
            const initialTee = defaultTee || whiteTee || initialCourse.teeBoxes[0];

            const initialPar = initialCourse.holes?.length ? initialCourse.holes.reduce((sum: number, h: any) => sum + h.par, 0) : 68;

            if (name !== initialCourse.name) return true;
            if (date !== today) return true;
            if (selectedCourseId !== initialCourse.id) return true;
            if (selectedTeeId !== (initialTee?.id || '')) return true;
            if (par !== initialPar) return true;
            if (rating !== (initialTee?.rating || 63.8)) return true;
            if (slope !== (initialTee?.slope || 100)) return true;

            return false;
        } else {
            // Edit mode
            if (name !== existingRound.name) return true;
            if (date !== existingRound.date) return true;
            if (par !== existingRound.par) return true;
            if (rating !== existingRound.rating) return true;
            if (slope !== existingRound.slope) return true;
            if (selectedCourseId !== (existingRound.courseId || '')) return true;

            return false;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md">
                <div className="w-10"></div>
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-center flex-1">{existingRound ? 'Edit Live Round' : 'New Live Round'}</h2>
                <div className="w-10"></div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                <div>
                    <label htmlFor="round-date" className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">Date</label>
                    <input
                        id="round-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                    />
                </div>

                {/* Course Selection */}
                <div>
                    <label htmlFor="round-course" className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">Course</label>
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
                        className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                    >
                        <option value="" disabled>-- Select Course --</option>
                        {allCourses?.map(c => (
                            <option key={c.id} value={c.id}>{c.name.replace(/New Orleans/gi, '').trim()}</option>
                        ))}
                    </select>
                </div>

                {/* Tee Box Selection (Helper for auto-filling) */}
                <div>
                    <label htmlFor="round-teebox" className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">Select Tee Box (Auto-fill)</label>
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
                        className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
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
                        <label htmlFor="round-par" className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">Par</label>
                        <input
                            id="round-par"
                            type="number"
                            value={par}
                            onChange={(e) => setPar(parseInt(e.target.value))}
                            className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                        />
                    </div>
                    <div>
                        <label htmlFor="round-rating" className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">Rating</label>
                        <input
                            id="round-rating"
                            type="number"
                            step="0.1"
                            value={rating}
                            onChange={(e) => setRating(parseFloat(e.target.value))}
                            className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                        />
                    </div>
                    <div>
                        <label htmlFor="round-slope" className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">Slope</label>
                        <input
                            id="round-slope"
                            type="number"
                            value={slope}
                            onChange={(e) => setSlope(parseInt(e.target.value))}
                            className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <div className="w-full mx-auto flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 py-4 bg-white text-black border-2 border-black rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white ${isDirty() ? 'bg-blue-600' : 'bg-black'}`}
                    >
                        {isSaving ? (
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            existingRound ? 'Save Round' : 'Start Round'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
