'use client';

import { useState, useEffect } from 'react';

// Native SVG icon
const CloseIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);

type Hole = {
    id: string;
    hole_number: number;
    par: number;
    difficulty: number | null;
};

type ScoreModalProps = {
    isOpen: boolean;
    onClose: () => void;
    playerName: string;
    courseName: string;
    courseId: string;
    roundPlayerId: string;
    currentGross: number | null;
    currentFront: number | null;
    currentBack: number | null;
    currentPoints?: number;
    currentPayout?: number;
    playerIndex?: number;
    indexAtTime?: number | null;
    teeBox?: { name: string; slope: number; rating: number } | null;
    coursePar?: number;
    onSave: (grossScore: number, frontNine: number, backNine: number, points: number, payout: number, holeScores: { holeId: string, strokes: number }[]) => Promise<void>;
};

// Helper component extracted to prevent re-creation on render
const NineHoleSection = ({
    title,
    holes,
    totalLabel,
    totalPar,
    totalScore,
    startIdx,
    scores,
    updateScore,
    getScoreClass
}: {
    title: string;
    holes: Hole[];
    totalLabel: string;
    totalPar: number;
    totalScore: number;
    startIdx: number;
    scores: number[];
    updateScore: (idx: number, val: string) => void;
    getScoreClass: (s: number, p: number) => string;
}) => (
    <div className="mb-6">
        <h4 className="font-bold text-black mb-2 px-1">{title}</h4>
        <div className="flex bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm">
            {/* Scrollable Hole Data */}
            <div className="flex-1 overflow-x-auto no-scrollbar">
                <table className="w-full text-center border-collapse min-w-[300px]">
                    <tbody>
                        {/* Header Row (Hole #) */}
                        <tr className="border-b border-gray-100">
                            {holes.map(h => (
                                <td key={h.id} className="px-1 py-2 w-10 font-bold text-[14pt] text-black">{h.hole_number}</td>
                            ))}
                        </tr>
                        {/* Par Row */}
                        <tr className="border-b border-gray-100">
                            {holes.map(h => (
                                <td key={h.id} className="px-1 py-2 w-10 text-[14pt] text-gray-500">{h.par}</td>
                            ))}
                        </tr>
                        {/* Score Row */}
                        <tr className="border-b border-gray-100">
                            {holes.map((h, idx) => {
                                const scoreIdx = startIdx + idx;
                                const score = scores[scoreIdx];
                                return (
                                    <td key={h.id} className={`p-1 w-10 font-black text-[14pt] ${getScoreClass(score, h.par)}`}>
                                        <input
                                            id={`hole-input-${scoreIdx}`}
                                            aria-label={`Score for hole ${h.hole_number}`}
                                            type="number"
                                            min="0"
                                            max="15"
                                            value={score || ''}
                                            onChange={(e) => updateScore(scoreIdx, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    // console.log('Enter pressed at index:', scoreIdx);
                                                    const nextId = `hole-input-${scoreIdx + 1}`;
                                                    const nextInput = document.getElementById(nextId);
                                                    if (nextInput) {
                                                        (nextInput as HTMLInputElement).focus();
                                                        (nextInput as HTMLInputElement).select();
                                                    } else {
                                                        (e.target as HTMLInputElement).blur();
                                                    }
                                                }
                                            }}
                                            className="w-full h-full text-center bg-transparent border-none outline-none font-black text-[14pt] focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-50 rounded-md caret-black"
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                        {/* Hardness Row */}
                        <tr>
                            {holes.map(h => (
                                <td key={h.id} className="px-1 py-2 w-10 text-[14pt] text-gray-400">{h.difficulty || '-'}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Fixed Total Column */}
            {/* Fixed Total Column */}
            <div className="w-16 bg-gray-100 border-l border-gray-200 shrink-0">
                <table className="w-full text-center border-collapse">
                    <tbody>
                        {/* Row 1: Header (Empty) */}
                        <tr className="border-b border-gray-100">
                            <td className="px-1 py-2 text-[14pt] font-bold text-transparent">&nbsp;</td>
                        </tr>
                        {/* Row 2: Total Par */}
                        <tr className="border-b border-gray-100">
                            <td className="px-1 py-2 text-[14pt] font-bold text-gray-400">{totalPar}</td>
                        </tr>
                        {/* Row 3: Total Score */}
                        <tr className="border-b border-gray-100">
                            <td className="px-1 py-2 text-[14pt] font-black text-black">{totalScore || '-'}</td>
                        </tr>
                        {/* Row 4: Hardness (Empty) */}
                        <tr>
                            <td className="px-1 py-2 text-[14pt] text-transparent">&nbsp;</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

export default function ScoreEntryModal({
    isOpen,
    onClose,
    playerName,
    courseName,
    courseId,
    roundPlayerId,
    currentGross,
    currentFront,
    currentBack,
    currentPoints,
    currentPayout,
    playerIndex,
    indexAtTime,
    teeBox,
    coursePar,
    onSave
}: ScoreModalProps) {
    const [holes, setHoles] = useState<Hole[]>([]);
    const [scores, setScores] = useState<number[]>(Array(18).fill(0));
    const [initialScores, setInitialScores] = useState<number[]>(Array(18).fill(0));
    const [points, setPoints] = useState<number>(currentPoints || 0);
    const [initialPoints, setInitialPoints] = useState<number>(currentPoints || 0);
    const [payout, setPayout] = useState<number>(currentPayout || 0);
    const [initialPayout, setInitialPayout] = useState<number>(currentPayout || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch hole data & existing scores when modal opens
    useEffect(() => {
        if (isOpen && courseId) {
            setIsLoading(true);

            // Reset points/payout from props
            setPoints(currentPoints || 0);
            setInitialPoints(currentPoints || 0);
            setPayout(currentPayout || 0);
            setInitialPayout(currentPayout || 0);

            // Check if this is a temporary/new round player
            const isNewRoundPlayer = roundPlayerId.startsWith('temp-');

            if (isNewRoundPlayer) {
                // For new rounds, just fetch holes, no existing scores
                fetch(`/api/holes?courseId=${courseId}`)
                    .then(res => res.json())
                    .then(holeData => {
                        console.log('Loaded holes:', holeData);
                        setHoles(holeData);
                        // Initialize with empty scores
                        setScores(Array(18).fill(0));
                        setInitialScores(Array(18).fill(0));
                        setIsLoading(false);
                    })
                    .catch(err => {
                        console.error('Failed to load holes:', err);
                        setIsLoading(false);
                    });
            } else {
                // For existing rounds, fetch both holes and scores
                Promise.all([
                    fetch(`/api/holes?courseId=${courseId}`).then(res => res.json()),
                    fetch(`/api/round-player/${roundPlayerId}/scores`).then(res => res.json())
                ])
                    .then(([holeData, existingScores]) => {
                        console.log('Loaded holes:', holeData);
                        console.log('Loaded existing scores:', existingScores);
                        setHoles(holeData);

                        // If we have existing scores, map them to our scores array
                        const loadedScores = Array(18).fill(0);
                        if (Array.isArray(existingScores) && existingScores.length > 0) {
                            existingScores.forEach((s: any) => {
                                // Find which hole index this is (0-17)
                                const holeIndex = holeData.findIndex((h: any) => h.id === s.hole_id);
                                if (holeIndex !== -1) {
                                    loadedScores[holeIndex] = s.strokes;
                                }
                            });
                        }
                        setScores(loadedScores);
                        setInitialScores([...loadedScores]);
                        setIsLoading(false);
                    })
                    .catch(err => {
                        console.error('Failed to load scorecard detail:', err);
                        setIsLoading(false);
                    });
            }
        }
    }, [isOpen, courseId, roundPlayerId, currentPoints, currentPayout]);

    if (!isOpen) return null;

    const hasChanges = () => {
        if (points !== initialPoints) return true;
        if (payout !== initialPayout) return true;
        return JSON.stringify(scores) !== JSON.stringify(initialScores);
    };

    const frontNineHoles = holes.filter(h => h.hole_number <= 9).sort((a, b) => a.hole_number - b.hole_number);
    const backNineHoles = holes.filter(h => h.hole_number > 9).sort((a, b) => a.hole_number - b.hole_number);

    const frontScores = scores.slice(0, 9);
    const backScores = scores.slice(9, 18);

    const frontTotal = frontScores.reduce((a, b) => a + b, 0);
    const backTotal = backScores.reduce((a, b) => a + b, 0);
    const grossTotal = frontTotal + backTotal;

    const frontPar = frontNineHoles.reduce((sum, h) => sum + h.par, 0);
    const backPar = backNineHoles.reduce((sum, h) => sum + h.par, 0);
    const totalPar = frontPar + backPar;

    // Calculate Course Handicap and Net Score
    const playerIdx = indexAtTime ?? playerIndex ?? 0;
    const slope = teeBox?.slope ?? 113;
    const rating = teeBox?.rating ?? 72;
    const par = coursePar ?? totalPar;
    const courseHcp = Math.round(playerIdx * (slope / 113) + (rating - par));
    const netScore = grossTotal > 0 ? grossTotal - courseHcp : 0;


    const getScoreClass = (score: number, par: number) => {
        if (score === 0) return 'bg-transparent text-black';
        const diff = score - par;
        if (diff <= -2) return 'bg-blue-200 text-blue-900'; // Eagle+
        if (diff === -1) return 'bg-emerald-200 text-emerald-900'; // Birdie
        if (diff === 0) return 'bg-white text-black'; // Par
        if (diff === 1) return 'bg-amber-100 text-amber-900'; // Bogey
        return 'bg-rose-200 text-rose-900'; // Double+
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const holeScores = holes.map((h, idx) => ({
                holeId: h.id,
                strokes: scores[idx] || 0
            }));
            await onSave(grossTotal, frontTotal, backTotal, points, payout, holeScores);
            onClose();
        } catch (error) {
            console.error('Failed to save score:', error);
            alert('Failed to save score');
        } finally {
            setIsSaving(false);
        }
    };

    const updateScore = (holeIndex: number, value: string) => {
        const numValue = parseInt(value) || 0;
        const newScores = [...scores];
        newScores[holeIndex] = numValue;
        setScores(newScores);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in duration-200">
            {/* Header Actions */}
            <div className="flex justify-between items-center px-1 py-3 bg-white border-b border-gray-100 shrink-0 safe-top">
                <div className="w-10"></div>
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-center flex-1">Scorecard</h2>
                <div className="w-10"></div>
            </div>

            {isLoading ? (
                <div className="p-12 text-center text-gray-500">Loading course data...</div>
            ) : holes.length === 0 ? (
                <div className="p-12 text-center">
                    <p className="text-gray-500 font-medium">No hole data found for this course.</p>
                    <p className="text-sm text-gray-400 mt-2">Please add hole information in the database first.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-y-auto flex-1 px-1 pb-8 bg-slate-50">

                        {/* Header Title */}
                        <div className="text-center mb-6 pt-4">
                            <h2 className="text-3xl font-black text-black tracking-tight">{playerName}</h2>

                            {/* Course and Tee Box Info */}
                            <div className="mt-3 space-y-1">
                                <p className="text-[14pt] font-bold text-gray-700">{courseName}</p>
                                {teeBox && (
                                    <div className="flex justify-center items-center gap-3 text-[14pt] text-gray-600">
                                        <span className="font-bold">Tee: {teeBox.name}</span>
                                        <span>•</span>
                                        <span>Par: {totalPar}</span>
                                        <span>•</span>
                                        <span>Rating: {teeBox.rating}</span>
                                        <span>•</span>
                                        <span>Slope: {teeBox.slope}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Front 9 */}
                        <NineHoleSection
                            title="Front 9"
                            holes={frontNineHoles}
                            totalLabel="OUT"
                            totalPar={frontPar}
                            totalScore={frontTotal}
                            startIdx={0}
                            scores={scores}
                            updateScore={updateScore}
                            getScoreClass={getScoreClass}
                        />

                        {/* Back 9 */}
                        <NineHoleSection
                            title="Back 9"
                            holes={backNineHoles}
                            totalLabel="IN"
                            totalPar={backPar}
                            totalScore={backTotal}
                            startIdx={9}
                            scores={scores}
                            updateScore={updateScore}
                            getScoreClass={getScoreClass}
                        />

                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-3 mt-8">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-blue-200 border border-blue-300 rounded-sm"></span>
                                <span className="text-[14pt] font-bold text-gray-500 uppercase">Eagle+</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-emerald-200 border border-emerald-300 rounded-sm"></span>
                                <span className="text-[14pt] font-bold text-gray-500 uppercase">Birdie</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-white border border-gray-200 rounded-sm"></span>
                                <span className="text-[14pt] font-bold text-gray-500 uppercase">Par</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-sm"></span>
                                <span className="text-[14pt] font-bold text-gray-500 uppercase">Bogey</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-rose-200 border border-rose-300 rounded-sm"></span>
                                <span className="text-[14pt] font-bold text-gray-500 uppercase">Double+</span>
                            </div>
                        </div>

                        {/* Big Stats Row */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mt-8 flex justify-around items-center text-center">
                            <div>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">GRS</span>
                                <span className="text-3xl sm:text-4xl font-black text-black">{grossTotal || '-'}</span>
                            </div>
                            <div className="w-px h-10 bg-gray-100 mx-1"></div>
                            <div>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">HCP</span>
                                <span className="text-3xl sm:text-4xl font-black text-black">{courseHcp}</span>
                            </div>
                            <div className="w-px h-10 bg-gray-100 mx-1"></div>
                            <div>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">NET</span>
                                <span className="text-3xl sm:text-4xl font-black text-black">{netScore || '-'}</span>
                            </div>
                        </div>

                    </div>

                    {/* Actions Footer - Fixed at bottom */}
                    <div className="flex gap-3 p-3 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 safe-bottom">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-white text-black border-2 border-black rounded-xl text-[15pt] font-bold shadow-xl active:scale-95 transition-all py-3"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || grossTotal === 0}
                            className={`flex-1 text-white font-bold px-4 py-3 text-[15pt] rounded-xl disabled:opacity-50 transition-all shadow-xl active:scale-95 ${hasChanges() ? 'bg-blue-600' : 'bg-black'}`}
                        >
                            {isSaving ? 'Saving...' : 'Save Score'}
                        </button>
                    </div>
                </>
            )}
        </div >
    );
}
