import React from 'react';


interface Player {
    id: string;
    name: string;
    totalGross: number;
    front9: number;
    back9: number;
    strokesReceivedSoFar: number;
    totalNet: number;
    toPar: number;
    courseHcp: number;
    thru: number;
    // Add other necessary fields
    liveRoundData?: {
        tee_box_name: string | null;
        course_hcp: number | null;
    } | null;
    preferred_tee_box?: string | null;
}

interface LiveLeaderboardCardProps {
    player: Player;
    scores: Map<number, number>; // Just this player's scores
    activeHole: number | null;
    isAdmin: boolean;
    summaryEditCell: { playerId: string; holeNumber: number } | null;
    setSummaryEditCell: React.Dispatch<React.SetStateAction<{ playerId: string; holeNumber: number } | null>>;
    handleAdminScoreChange: (playerId: string, holeNumber: number, newValue: string) => void;
    defaultCourse: any; // Type strictly if possible, but any is safe for extraction
}

// Helper
const splitName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { first: parts[0], last: '' };
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(' ');
    return { first, last };
};

const getPlayerTee = (player: Player) => {
    // Simplified logic based on what was seen in the main file
    // The main file used a complex logic with defaultCourse.teeBoxes
    // For now, we'll try to rely on liveRoundData if available or just return null/default
    // BUT the display logic uses `tee` object for name.
    // If we can pass the derived "teeLetter" or "teeColorClass" that would be better.
    return null;
};

// Better approach: Pass the derived Tee Info as a prop? 
// Or replicate the logic. Replicating logic requires `defaultCourse` and `player` which we have.
// Let's assume we can calculate it inside or pass it. 
// For this refactor, I'll copy the logic if it's small, or ask to pass it.
// The logic in main file:
/*
    const tee = (() => {
        if (!defaultCourse) return null;
        if (p.liveRoundData?.tee_box_name) {
             return defaultCourse.teeBoxes.find(t => t.name === p.liveRoundData.tee_box_name);
        }
        // ... fallbacks ...
    })();
*/

export const LiveLeaderboardCard = ({
    player: p,
    scores, // This player's scores map
    activeHole,
    isAdmin,
    summaryEditCell,
    setSummaryEditCell,
    handleAdminScoreChange,
    defaultCourse
}: LiveLeaderboardCardProps) => {

    const getSavedScore = (holeNumber: number) => scores?.get(holeNumber) ?? null;

    const tee = (() => {
        if (!defaultCourse) return null;
        if (p.liveRoundData?.tee_box_name) {
            return defaultCourse.teeBoxes.find((t: any) => t.name === p.liveRoundData?.tee_box_name);
        }
        if (p.preferred_tee_box) {
            return defaultCourse.teeBoxes.find((t: any) => t.id === p.preferred_tee_box || t.name === p.preferred_tee_box);
        }
        return null;
    })();

    let toParStr = "E";
    // let toParClass = "text-green-600"; // Unused in main file logic inside the card (calculated inline)
    if (p.toPar > 0) {
        toParStr = `+${p.toPar}`;
    } else if (p.toPar < 0) {
        toParStr = `${p.toPar}`;
    }

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-zinc-200 shadow-xl">
            {/* Player Header */}
            <div className="bg-gradient-to-r from-green-600/5 to-transparent p-2 border-b border-zinc-100">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    {/* Left: Name */}
                    <div className="flex items-center gap-1 justify-self-start">
                        <div className="flex flex-col">
                            <div className="font-black text-zinc-900 text-2xl italic uppercase tracking-tighter leading-none flex items-center gap-1">
                                {splitName(p.name).first}
                                {(() => {
                                    if (!tee) return null;
                                    const letter = tee.name.toLowerCase().includes('white') ? 'W'
                                        : tee.name.toLowerCase().includes('gold') ? 'G'
                                            : tee.name.charAt(0).toUpperCase();
                                    const colorClass = letter === 'W' ? 'bg-zinc-100 text-black'
                                        : letter === 'G' ? 'bg-yellow-400 text-black'
                                            : 'bg-zinc-500 text-white';

                                    return (
                                        <span className={`text-[10px] font-black px-1 py-0.5 rounded-md ${colorClass} uppercase tracking-widest`}>
                                            {letter}
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">{splitName(p.name).last}</div>
                        </div>
                    </div>

                    {/* Center: To Par Score */}
                    <div className="justify-self-center">
                        <div className="bg-black text-white rounded-md px-3 py-1 min-w-[3.5rem] text-center shadow-md">
                            <div className="text-[21pt] font-black italic tracking-tighter leading-none">
                                {toParStr}
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex gap-2 items-end justify-self-end">
                        <div className="flex flex-col items-center gap-0">
                            <div className="text-[11pt] text-zinc-500 font-black tracking-widest uppercase">GRS</div>
                            <div className={`text-xl font-black italic tracking-tighter leading-none ${p.toPar < 0 ? 'text-red-600' : p.toPar > 0 ? 'text-zinc-900' : 'text-green-600'}`}>
                                {p.front9 > 0 || p.back9 > 0 ? (
                                    <>{p.front9}+{p.back9}={p.totalGross}</>
                                ) : (
                                    <>{p.totalGross}</>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-0">
                            <div className="text-[11pt] text-zinc-500 font-black tracking-widest uppercase">HCP</div>
                            <div className={`text-xl font-black italic tracking-tighter leading-none ${p.toPar < 0 ? 'text-red-600' : p.toPar > 0 ? 'text-zinc-900' : 'text-green-600'}`}>{isNaN(p.courseHcp) ? 0 : p.courseHcp}</div>
                        </div>
                        <div className="flex flex-col items-center gap-0">
                            <div className="text-[11pt] text-zinc-500 font-black tracking-widest uppercase">NET</div>
                            <div className={`text-xl font-black italic tracking-tighter leading-none ${p.toPar < 0 ? 'text-red-600' : p.toPar > 0 ? 'text-zinc-900' : 'text-green-600'}`}>{isNaN(p.totalNet) ? 0 : p.totalNet}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score Grid */}
            <div className="border-t border-zinc-100 bg-zinc-50/30">
                {/* Row 1: Holes 1-9 */}
                <div className="grid grid-cols-9 border-b border-zinc-100">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                        const score = getSavedScore(num);
                        const isActive = activeHole === num;
                        const hole = defaultCourse?.holes.find((h: any) => h.holeNumber === num);
                        const holePar = hole?.par || 4;

                        let shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black italic tracking-tighter text-black";
                        // Active hole still gets a subtle green background if no score
                        let bgColor = isActive ? "bg-green-600/10" : "bg-transparent";

                        if (score !== null) {
                            const diff = score - holePar;
                            if (diff <= -2) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-yellow-300 rounded"; // Eagle
                            else if (diff === -1) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-green-300 rounded"; // Birdie
                            else if (diff === 0) { shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black"; } // Par
                            else if (diff === 1) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-orange-300 rounded"; // Bogey
                            else if (diff >= 2) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-red-300 rounded"; // Double Bogey
                        }

                        return (
                            <div key={num}
                                onClick={() => {
                                    if (isAdmin) setSummaryEditCell({ playerId: p.id, holeNumber: num });
                                }}
                                className={`
                                flex flex-col items-center justify-center h-14 border-r border-zinc-100 last:border-r-0 relative transition-all
                                ${bgColor}
                                ${isActive ? 'ring-1 ring-green-600/50 inset-0 z-10' : ''}
                                ${isAdmin ? 'cursor-pointer hover:bg-zinc-100' : ''}
                            `}>
                                <div className="absolute top-0.5 inset-x-0 flex justify-center items-baseline px-1 leading-none gap-0.5">
                                    <span className="text-[11pt] font-black text-zinc-900">{num}</span>
                                    <span className="text-[10pt] font-medium text-zinc-500">/{holePar}</span>
                                </div>
                                {isAdmin && summaryEditCell?.playerId === p.id && summaryEditCell?.holeNumber === num ? (
                                    <input
                                        type="number"
                                        aria-label={`Score for hole ${num}`}
                                        inputMode="numeric"
                                        autoFocus
                                        className="w-full text-center bg-white text-zinc-900 font-black text-lg focus:outline-none border-none"
                                        defaultValue={score || ''}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAdminScoreChange(p.id, num, (e.target as HTMLInputElement).value);
                                                if (num < 18) setSummaryEditCell({ playerId: p.id, holeNumber: num + 1 });
                                                else setSummaryEditCell(null);
                                            } else if (e.key === 'Escape') setSummaryEditCell(null);
                                        }}
                                        onBlur={(e) => {
                                            handleAdminScoreChange(p.id, num, e.target.value);
                                            setTimeout(() => setSummaryEditCell((prev: any) => (prev?.playerId === p.id && prev?.holeNumber === num) ? null : prev), 100);
                                        }}
                                    />
                                ) : (
                                    <div className={`${shapeClass} mt-4`}>
                                        {score || '-'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Row 2: Holes 10-18 */}
                <div className="grid grid-cols-9">
                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => {
                        const score = getSavedScore(num);
                        const isActive = activeHole === num;
                        const hole = defaultCourse?.holes.find((h: any) => h.holeNumber === num);
                        const holePar = hole?.par || 4;

                        let shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black italic tracking-tighter text-black";
                        // Active hole still gets a subtle green background if no score
                        let bgColor = isActive ? "bg-green-600/10" : "bg-transparent";

                        if (score !== null) {
                            const diff = score - holePar;
                            if (diff <= -2) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-yellow-300 rounded"; // Eagle
                            else if (diff === -1) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-green-300 rounded"; // Birdie
                            else if (diff === 0) { shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black"; } // Par
                            else if (diff === 1) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-orange-300 rounded"; // Bogey
                            else if (diff >= 2) shapeClass = "w-7 h-7 flex items-center justify-center text-sm font-black text-black bg-red-300 rounded"; // Double Bogey
                        }

                        return (
                            <div key={num}
                                onClick={() => {
                                    if (isAdmin) setSummaryEditCell({ playerId: p.id, holeNumber: num });
                                }}
                                className={`
                                flex flex-col items-center justify-center h-14 border-r border-zinc-100 last:border-r-0 relative transition-all
                                ${bgColor}
                                ${isActive ? 'ring-1 ring-green-600/50 inset-0 z-10' : ''}
                                ${isAdmin ? 'cursor-pointer hover:bg-zinc-100' : ''}
                            `}>
                                <div className="absolute top-0.5 inset-x-0 flex justify-center items-baseline px-1 leading-none gap-0.5">
                                    <span className="text-[11pt] font-black text-zinc-900">{num}</span>
                                    <span className="text-[10pt] font-medium text-zinc-500">/{holePar}</span>
                                </div>
                                {isAdmin && summaryEditCell?.playerId === p.id && summaryEditCell?.holeNumber === num ? (
                                    <input
                                        type="number"
                                        aria-label={`Score for hole ${num}`}
                                        inputMode="numeric"
                                        autoFocus
                                        className="w-full text-center bg-white text-zinc-900 font-black text-lg focus:outline-none border-none"
                                        defaultValue={score || ''}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAdminScoreChange(p.id, num, (e.target as HTMLInputElement).value);
                                                if (num < 18) setSummaryEditCell({ playerId: p.id, holeNumber: num + 1 });
                                                else setSummaryEditCell(null);
                                            } else if (e.key === 'Escape') setSummaryEditCell(null);
                                        }}
                                        onBlur={(e) => {
                                            handleAdminScoreChange(p.id, num, e.target.value);
                                            setTimeout(() => setSummaryEditCell((prev: any) => (prev?.playerId === p.id && prev?.holeNumber === num) ? null : prev), 100);
                                        }}
                                    />
                                ) : (
                                    <div className={`${shapeClass} mt-4`}>
                                        {score || '-'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
