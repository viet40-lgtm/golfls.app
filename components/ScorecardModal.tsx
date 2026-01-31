
'use client';

import React from 'react';
// Native SVG icon to bypass Lucide/Turbopack crash
const CloseIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);
import { format } from 'date-fns';

// Define types based on what we fetch
// Define types based on what we fetch
type ScorecardData = {
    id: string;
    grossScore: number | null;
    // adjusted_gross_score: number | null; // Not in schema
    // score_differential: number | null; // Not in schema
    // indexAtTime: number | null; // Not in schema
    player: {
        name: string;
        handicapIndex: number;
    };
    round: {
        date: string;
        isTournament: boolean;
        name: string | null;
        course: {
            name: string;
            holes: Array<{
                id: string;
                holeNumber: number;
                par: number;
                difficulty: number | null;
            }>;
        };
    };
    teeBox: {
        name: string;
        rating: number;
        slope: number;
    } | null;
    scores: Array<{
        id: string;
        strokes: number;
        hole: {
            holeNumber: number;
        };
    }>;
};

interface ScorecardModalProps {
    data: ScorecardData;
    isOpen: boolean;
    onClose: () => void;
}

export function ScorecardModal({ data, isOpen, onClose }: ScorecardModalProps) {
    if (!isOpen) return null;

    const { player, round, teeBox, scores } = data;
    const course = round.course;

    // Organize scores by hole number for easy access
    const scoreMap = new Map<number, number>();
    scores.forEach(s => scoreMap.set(s.hole.holeNumber, s.strokes));

    // Calculate Totals
    const front9 = course.holes.filter(h => h.holeNumber <= 9);
    const back9 = course.holes.filter(h => h.holeNumber > 9);

    const calcTotal = (holes: typeof front9, metric: 'par' | 'score') => {
        return holes.reduce((sum, h) => {
            if (metric === 'par') return sum + h.par;
            return sum + (scoreMap.get(h.holeNumber) || 0);
        }, 0);
    };

    const front9Par = calcTotal(front9, 'par');
    const front9Score = calcTotal(front9, 'score');
    const back9Par = calcTotal(back9, 'par');
    const back9Score = calcTotal(back9, 'score');

    const totalPar = front9Par + back9Par;
    const totalScore = front9Score + back9Score;

    // Handicap Calcs
    const slope = teeBox?.slope || 113;
    const par = course.holes.reduce((sum, h) => sum + h.par, 0);
    const rating = teeBox?.rating || par;
    const idx = data.player.handicapIndex ?? 0;

    // Match the logic from scores/page.tsx: (Index * Slope / 113) + (Rating - Par)
    const courseHcp = Math.round(idx * (slope / 113) + (rating - par));
    const netScore = (totalScore || 0) - courseHcp;

    // Helper for background colors
    const getScoreClass = (par: number, score: number | undefined) => {
        if (!score) return "bg-transparent";
        const diff = score - par;
        if (diff <= -2) return "bg-yellow-300"; // Eagle: Darker Yellow
        if (diff === -1) return "bg-green-300"; // Birdie: Darker Green
        if (diff === 0) return "bg-white text-black"; // Par: Pure White
        if (diff === 1) return "bg-orange-200"; // Bogey: Darker Orange
        return "bg-red-300"; // Double Bogey+: Darker Red
    };

    // Sub-component for a 9-hole section
    const NineHoleSection = ({
        title,
        holes,
        totalLabel,
        totalPar,
        totalScore
    }: {
        title: string,
        holes: typeof front9,
        totalLabel: string,
        totalPar: number,
        totalScore: number
    }) => (
        <div className="mb-6">
            <h4 className="font-bold text-black mb-2 px-1 text-[14pt]">{title}</h4>
            <div className="flex bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm">

                {/* Scrollable Hole Data */}
                <div className="flex-1 overflow-x-auto no-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[300px]">
                        <tbody>
                            {/* Header Row (Hole #) */}
                            <tr className="border-b border-gray-100">
                                {holes.map(h => (
                                    <td key={h.id} className="px-1 py-2 w-10 font-bold text-[14pt] text-black">{h.holeNumber}</td>
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
                                {holes.map(h => {
                                    const score = scoreMap.get(h.holeNumber);
                                    return (
                                        <td key={h.id} className={`px-1 py-2 w-10 font-black text-[14pt] ${getScoreClass(h.par, score)}`}>
                                            {score || '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                            {/* Difficulty Row */}
                            <tr>
                                {holes.map(h => (
                                    <td key={h.id} className="px-1 py-2 w-10 text-[14pt] text-gray-400">{h.difficulty || '-'}</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Fixed Total Column */}
                {/* Fixed Total Column - As a matching table for alignment */}
                <div className="w-16 bg-gray-100 border-l border-gray-200 shrink-0">
                    <table className="w-full text-center border-collapse">
                        <tbody>
                            {/* Row 1: Header (Empty) */}
                            <tr className="border-b border-gray-100">
                                <td className="px-1 py-2 text-[14pt] font-bold text-transparent">&nbsp;</td>
                            </tr>
                            {/* Row 2: Total Par */}
                            <tr className="border-b border-gray-100">
                                <td className="px-1 py-2 text-[14pt] font-bold text-gray-500">{totalPar}</td>
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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header Actions */}
                <div className="flex justify-between items-center p-3 bg-white border-b border-gray-100">
                    <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest">Scorecard</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                    >
                        Close
                    </button>
                </div>

                <div className="overflow-y-auto px-1 pb-8 bg-slate-50">

                    {/* Header Title & Date */}
                    <div className="text-center mb-8 px-1">
                        <h2 className="text-[14pt] font-black text-black tracking-tight flex items-center justify-center gap-2">
                            {player.name}
                        </h2>
                        <div className="flex justify-center items-center gap-3 mt-2 text-[14pt] text-gray-500 font-medium whitespace-nowrap overflow-x-auto no-scrollbar">
                            <span>{format(new Date(round.date), 'MMMM d, yyyy')}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>{course.name}</span>
                        </div>
                        <div className="flex justify-center items-center gap-3 mt-1 text-[14pt] text-gray-600 font-medium whitespace-nowrap overflow-x-auto no-scrollbar">
                            <span className="text-blue-600">{teeBox?.name}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>Par {totalPar}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>Rating {teeBox?.rating.toFixed(1)}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>Slope {teeBox?.slope}</span>
                        </div>
                    </div>

                    {/* Big Stats Row moved to bottom */}

                    {/* Front 9 */}
                    <NineHoleSection
                        title="Front 9"
                        holes={front9}
                        totalLabel="OUT"
                        totalPar={front9Par}
                        totalScore={front9Score}
                    />

                    {/* Back 9 */}
                    <NineHoleSection
                        title="Back 9"
                        holes={back9}
                        totalLabel="IN"
                        totalPar={back9Par}
                        totalScore={back9Score}
                    />

                    {/* Big Stats Row moved to bottom */}

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-3 mt-8">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-yellow-300 rounded-sm"></span>
                            <span className="text-[14pt] font-bold text-gray-500 uppercase">Eagle (-2)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-green-300 rounded-sm"></span>
                            <span className="text-[14pt] font-bold text-gray-500 uppercase">Birdie (-1)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-white border border-gray-300 rounded-sm"></span>
                            <span className="text-[14pt] font-bold text-gray-500 uppercase">Par (E)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-orange-200 rounded-sm"></span>
                            <span className="text-[14pt] font-bold text-gray-500 uppercase">Bogey (+1)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-red-300 rounded-sm"></span>
                            <span className="text-[14pt] font-bold text-gray-500 uppercase">Double+ (+2)</span>
                        </div>
                    </div>

                    {/* Big Stats Row */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mt-8 flex justify-around items-center text-center">
                        <div className="text-left">
                            <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-wider block mb-1">GRS</span>
                            <span className="text-[14pt] font-black text-black">
                                {front9Score > 0 || back9Score > 0 ? (
                                    <>{front9Score} + {back9Score} = {totalScore}</>
                                ) : (
                                    <>{totalScore || '-'}</>
                                )}
                            </span>
                        </div>
                        <div className="w-px h-10 bg-gray-100 mx-1"></div>
                        <div>
                            <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-wider block mb-1">HCP</span>
                            <span className="text-[14pt] font-black text-black">{courseHcp}</span>
                        </div>
                        <div className="w-px h-10 bg-gray-100 mx-1"></div>
                        <div>
                            <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-wider block mb-1">NET</span>
                            <span className="text-[14pt] font-black text-black">{netScore || '-'}</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}


