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
    scorerId?: string | null;
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
            const match = defaultCourse.teeBoxes.find((t: any) => t.name === p.liveRoundData?.tee_box_name);
            if (match) return match;
        }
        if (p.preferred_tee_box) {
            const match = defaultCourse.teeBoxes.find((t: any) => t.id === p.preferred_tee_box || t.name === p.preferred_tee_box);
            if (match) return match;
            const partial = defaultCourse.teeBoxes.find((t: any) => t.name.toLowerCase().includes(p.preferred_tee_box!.toLowerCase()));
            if (partial) return partial;
        }
        // Fallback to White or first available
        const white = defaultCourse.teeBoxes.find((t: any) => t.name.toLowerCase().includes('white'));
        return white || defaultCourse.teeBoxes[0];
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
            <div className="bg-blue-600 p-1 border-b border-black">
                <div className="flex items-center justify-between gap-4 p-1 text-white">
                    {/* Left: Name */}
                    <div className="flex items-center gap-1">
                        <div className="flex flex-col">
                            <div className="font-black text-2xl italic uppercase tracking-tighter leading-none flex items-center gap-2">
                                {splitName(p.name).first}
                                {(() => {
                                    if (!tee) return null;
                                    const letter = tee.name.toLowerCase().includes('white') ? 'W'
                                        : tee.name.toLowerCase().includes('gold') ? 'G'
                                            : tee.name.charAt(0).toUpperCase();

                                    return (
                                        <span className={`text-sm font-black px-1.5 py-0.5 rounded bg-white text-black uppercase tracking-widest`}>
                                            {letter}
                                        </span>
                                    );
                                })()}
                                {!p.scorerId && (
                                    <span className="text-[12px] font-black text-red-600 uppercase">
                                        No Score Keeper
                                    </span>
                                )}
                            </div>
                            <div className="text-white text-sm font-bold uppercase tracking-widest mt-0.5 opacity-90">{splitName(p.name).last}</div>
                        </div>
                    </div>

                    {/* Right: Stats and To Par */}
                    <div className="flex gap-3 items-center">
                        {/* To Par Score moved here */}
                        <div className="bg-white text-black rounded px-2 py-0.5 min-w-[3rem] text-center shadow-sm h-fit self-center">
                            <div className="text-xl font-black italic tracking-tighter leading-none">
                                {toParStr}
                            </div>
                        </div>

                        <div className="flex gap-3 items-center text-sm">
                            <div className="flex flex-col items-center gap-0">
                                <div className="text-base font-black tracking-widest uppercase opacity-80">GRS</div>
                                <div className={`text-xl font-bold leading-none`}>
                                    {p.front9 > 0 || p.back9 > 0 ? (
                                        <>{p.front9}+{p.back9}={p.totalGross}</>
                                    ) : (
                                        <>{p.totalGross}</>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-0">
                                <div className="text-base font-black tracking-widest uppercase opacity-80">HCP</div>
                                <div className={`text-xl font-bold leading-none`}>{isNaN(p.courseHcp) ? 0 : p.courseHcp}</div>
                            </div>
                            <div className="flex flex-col items-center gap-0">
                                <div className="text-base font-black tracking-widest uppercase opacity-80">NET</div>
                                <div className={`text-xl font-bold leading-none text-green-400`}>{isNaN(p.totalNet) ? 0 : p.totalNet}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score Grid */}
            <div className="border-t border-black bg-zinc-50/30">
                {/* Row 1: Holes 1-9 */}
                <div className="grid grid-cols-9 border-b border-black">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                        const score = getSavedScore(num);
                        const isActive = activeHole === num;
                        const hole = defaultCourse?.holes.find((h: any) => h.holeNumber === num);
                        const holePar = hole?.par || 4;

                        let shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black italic tracking-tighter text-black";
                        // Active hole still gets a subtle green background if no score
                        let bgColor = isActive ? "bg-green-600/10" : "bg-transparent";

                        if (score !== null) {
                            const diff = score - holePar;
                            if (diff <= -2) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-yellow-300 rounded"; // Eagle
                            else if (diff === -1) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-green-300 rounded"; // Birdie
                            else if (diff === 0) { shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black"; } // Par
                            else if (diff === 1) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-orange-300 rounded"; // Bogey
                            else if (diff >= 2) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-red-300 rounded"; // Double Bogey
                        }

                        return (
                            <div key={num}
                                onClick={() => {
                                    if (isAdmin) setSummaryEditCell({ playerId: p.id, holeNumber: num });
                                }}
                                className={`
                                flex flex-col items-center justify-center h-14 border-r border-black last:border-r-0 relative transition-all
                                ${bgColor}
                                ${isActive ? 'ring-inset ring-2 ring-black z-20' : ''}
                                ${isAdmin ? 'cursor-pointer hover:bg-zinc-100' : ''}
                            `}>
                                <div className="absolute top-0.5 inset-x-0 flex justify-center items-baseline px-1 leading-none gap-0.5">
                                    <span className="text-lg font-bold text-black">{num}</span>
                                    <span className="text-base text-gray-500 font-medium">/{holePar}</span>
                                </div>
                                {isAdmin && summaryEditCell?.playerId === p.id && summaryEditCell?.holeNumber === num ? (
                                    <input
                                        type="number"
                                        aria-label={`Score for hole ${num}`}
                                        inputMode="numeric"
                                        autoFocus
                                        className="w-full text-center bg-white text-zinc-900 font-black text-3xl focus:outline-none border-none"
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
                                    <div className={`${shapeClass} mt-6`}>
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

                        let shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black italic tracking-tighter text-black";
                        // Active hole still gets a subtle green background if no score
                        let bgColor = isActive ? "bg-green-600/10" : "bg-transparent";

                        if (score !== null) {
                            const diff = score - holePar;
                            if (diff <= -2) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-yellow-300 rounded"; // Eagle
                            else if (diff === -1) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-green-300 rounded"; // Birdie
                            else if (diff === 0) { shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black"; } // Par
                            else if (diff === 1) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-orange-300 rounded"; // Bogey
                            else if (diff >= 2) shapeClass = "w-7 h-7 flex items-center justify-center text-3xl font-black text-black bg-red-300 rounded"; // Double Bogey
                        }

                        return (
                            <div key={num}
                                onClick={() => {
                                    if (isAdmin) setSummaryEditCell({ playerId: p.id, holeNumber: num });
                                }}
                                className={`
                                flex flex-col items-center justify-center h-14 border-r border-black last:border-r-0 relative transition-all
                                ${bgColor}
                                ${isActive ? 'ring-inset ring-2 ring-black z-20' : ''}
                                ${isAdmin ? 'cursor-pointer hover:bg-zinc-100' : ''}
                            `}>
                                <div className="absolute top-0.5 inset-x-0 flex justify-center items-baseline px-1 leading-none gap-0.5">
                                    <span className="text-lg font-bold text-black">{num}</span>
                                    <span className="text-base text-gray-500 font-medium">/{holePar}</span>
                                </div>
                                {isAdmin && summaryEditCell?.playerId === p.id && summaryEditCell?.holeNumber === num ? (
                                    <input
                                        type="number"
                                        aria-label={`Score for hole ${num}`}
                                        inputMode="numeric"
                                        autoFocus
                                        className="w-full text-center bg-white text-zinc-900 font-black text-3xl focus:outline-none border-none"
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
                                    <div className={`${shapeClass} mt-6`}>
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



