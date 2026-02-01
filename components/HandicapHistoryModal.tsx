'use client';

import React, { useEffect, useState } from 'react';
import { getHandicapHistory, HandicapHistoryResponse } from '@/app/actions/get-handicap-history';
import { format } from 'date-fns';

const XIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

const CopyIcon = ({ size = 24, className }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
);

interface HandicapHistoryModalProps {
    playerId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function HandicapHistoryModal({ playerId, isOpen, onClose }: HandicapHistoryModalProps) {
    const [data, setData] = useState<HandicapHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleRounds, setVisibleRounds] = useState(20);

    useEffect(() => {
        if (isOpen && playerId) {
            setLoading(true);
            setError(null);
            setVisibleRounds(20);
            getHandicapHistory(playerId)
                .then(setData)
                .catch(err => {
                    console.error(err);
                    setError(err instanceof Error ? err.message : 'An unknown error occurred');
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, playerId]);

    if (!isOpen) return null;

    if (error) {
        return (
            <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in items-center justify-center p-4">
                <div className="text-red-600 text-[16pt] font-bold mb-4">Error Loading History</div>
                <div className="text-gray-700 mb-6">{error}</div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold"
                >
                    Close
                </button>
            </div>
        );
    }

    const handleCopyFullHistory = async () => {
        if (!data) return;

        let html = `
            <div style="font-family: sans-serif; color: #111; max-width: 800px;">
                <div style="margin-bottom: 20px; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 24px;">${data.player.name} - Handicap History</h2>
                    <div style="margin-top: 5px; font-size: 18px;">
                        Official Index: <b>${data.player.currentIndex.toFixed(1)}</b>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0; text-align: left;">
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0;">Date</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Tee</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Grs</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Adj</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Diff</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Hcp</th>
                            <th style="padding: 10px; text-align: center;">Index</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.history.forEach((item, idx) => {
            const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            const chBefore = calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72);
            const chAfter = calculateCourseHandicap(item.indexAfter, item.slope || 113, item.rating || 72, item.par || 72);
            const datePart = format(new Date(item.date), 'MM/dd/yy');

            html += `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0;">
                        <span style="font-weight: bold;">${datePart}</span>
                        ${item.used ? ' <br><span style="color: #16a34a; font-size: 10px; font-weight: bold;">[USED]</span>' : ''}
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; color: #64748b;">
                        ${item.teeColor || 'Est'}<br>
                        <span style="font-size: 11px;">P${item.par}/R${item.rating}</span>
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: bold;">
                        ${item.gross || '-'}
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: bold;">
                        <span style="${item.adjusted && item.adjusted !== item.gross ? 'color: #dc2626;' : ''}">
                            ${item.adjusted || item.gross || '-'}
                        </span>
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: bold; background: #fdf2f2;">
                        ${item.differential.toFixed(1)}
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center;">
                        <span style="color: #94a3b8; font-size: 12px;">${chBefore} &rarr;</span>
                        <br>
                        <b style="color: ${chAfter > chBefore ? '#16a34a' : '#dc2626'}; text-decoration: underline;">${chAfter}</b>
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <span style="color: #94a3b8; font-size: 12px;">${item.indexBefore.toFixed(1)} &rarr;</span>
                        <br>
                        <b style="color: ${item.indexAfter > item.indexBefore ? '#16a34a' : '#dc2626'};">${item.indexAfter.toFixed(1)}</b>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <p style="margin-top: 15px; font-size: 12px; color: #94a3b8; text-align: center;">
                    Golf Live Scores - GolfLS.app - Handicap History Report
                </p>
            </div>
        `;

        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([html.replace(/<[^>]*>?/gm, "")], { type: 'text/plain' });

        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                })
            ]);
            alert('Handicap history copied as a clean table!');
        } catch (e) {
            console.error(e);
            alert('Failed to copy');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="bg-slate-50 border-b border-gray-100 px-1 py-4 flex justify-between items-center shrink-0 safe-top">
                <div className="flex flex-col">
                    <h2 className="text-[14pt] font-black text-gray-900 leading-tight ml-3">
                        {data?.player.name || 'Loading...'}
                    </h2>
                    <p className="text-[14pt] text-blue-600 font-bold ml-3">Handicap History</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopyFullHistory}
                        className="p-2 bg-black hover:bg-gray-800 rounded-full transition-colors flex items-center justify-center group"
                        title="Copy Full History"
                    >
                        <CopyIcon size={24} className="text-white" />
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-1 py-4 bg-slate-50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <LoaderIcon className="w-8 h-8 animate-spin text-green-600" />
                        <p className="text-[14pt] text-gray-400 font-medium">Calculating Handicap History...</p>
                    </div>
                ) : (data && (
                    <div className="space-y-6 w-full">

                        {/* Official Handicap Card */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                            <h3 className="font-bold text-gray-900 text-[14pt] mb-2">Official Handicap (From Database)</h3>
                            <div className="text-[14pt] font-bold text-gray-800 mb-6">
                                <div className="mb-1">
                                    Handicap Index: <span className="text-black text-[14pt]">{data.player.currentIndex.toFixed(1)}</span>
                                </div>
                                <div className="text-gray-500 text-sm">
                                    Low Index (12-mo): <span className="text-gray-900 font-bold">{data.player.lowIndex !== null ? data.player.lowIndex.toFixed(1) : 'N/A'}</span>
                                    {data.player.lowIndex !== null && (
                                        <span className="text-xs ml-2 text-gray-400">
                                            (Soft Cap: {(data.player.lowIndex + 3).toFixed(1)}, Hard Cap: {(data.player.lowIndex + 5).toFixed(1)})
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <p className="font-bold text-gray-700 mb-2 text-[14pt]">Course Handicap (Par {data.courseData.par}):</p>
                                <div className="flex flex-col gap-2 items-center justify-center text-[14pt]">
                                    {data.courseData.tees
                                        .filter(t => ['White', 'Gold'].includes(t.name))
                                        .length === 0 ? (
                                        data.courseData.tees.slice(0, 2).map(t => (
                                            <TeeLine key={t.name} tee={t} index={data.player.currentIndex} par={data.courseData.par} />
                                        ))
                                    ) : (
                                        data.courseData.tees
                                            .filter(t => ['White', 'Gold'].includes(t.name))
                                            .map(t => (
                                                <TeeLine key={t.name} tee={t} index={data.player.currentIndex} par={data.courseData.par} />
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Scoring Record Header */}
                        <div className="px-1">
                            <h3 className="font-bold text-gray-900 text-[14pt]">Recent Scoring Record</h3>
                            <p className="text-sm text-gray-500 mt-1">Showing {Math.min(visibleRounds, data.history.length)} of {data.history.length} rounds (Best 8 count toward Index)</p>
                        </div>

                        {/* List - Show visible rounds */}
                        <div className="space-y-4">
                            {data.history.slice(0, visibleRounds).map((item) => (
                                <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 relative overflow-hidden">
                                    {/* Row 1: Date & Tee */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-900 text-[14pt]">
                                                {(() => {
                                                    if (item.date.length === 10) {
                                                        const [y, m, d] = item.date.split('-').map(Number);
                                                        return format(new Date(y, m - 1, d, 12), 'MMM d, yyyy');
                                                    }
                                                    return format(new Date(item.date), 'MMM d, yyyy');
                                                })()}
                                            </span>
                                            {/* Used Badge - Use usedForCurrent if available, fallback to historical used */}
                                            {item.usedForCurrent && (
                                                <span className="bg-green-600 text-white text-[14pt] font-bold px-1 py-0.5 rounded">USED</span>
                                            )}
                                        </div>
                                        {/* Diff */}
                                        <div className="text-right">
                                            <div className="font-black text-gray-900 text-[14pt] leading-none">
                                                Diff: {item.differential.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Details */}
                                    <div className="text-[14pt] text-gray-600 mb-4 flex flex-col gap-1">
                                        {item.gross ? (
                                            <div>
                                                <span className="font-medium text-gray-900">Grs: {item.gross}</span>
                                                <span className="text-gray-400 mx-1">-</span>
                                                <span className="text-gray-500">{calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72)}</span>
                                                <span className="text-gray-400 mx-1">=</span>
                                                <span className="font-black text-blue-600">Net: {item.gross - calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72)}</span>
                                                <span className="mx-1 text-gray-300">|</span>
                                                <span className={item.adjusted && item.adjusted !== item.gross ? "text-red-600 font-bold" : ""}>
                                                    Adj: {item.adjusted || item.gross}
                                                </span>
                                            </div>
                                        ) : (
                                            <div>Adjusted Gross Score (Historical)</div>
                                        )}
                                        {item.rating && (
                                            <div className="text-[14pt] text-gray-400">
                                                Par {item.par} • Rating {item.rating} • Slope {item.slope} • {item.teeColor || 'Est'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 3: Progression (Divider) */}
                                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[14pt]">

                                        {/* Handicap (Est) */}
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-500">Hcp ({item.teeColor || 'Est'}):</span>
                                            <span className="font-mono text-gray-400 min-w-[50px] text-right">
                                                {(() => {
                                                    const hcpBefore = calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72);
                                                    const hcpAfter = calculateCourseHandicap(item.indexAfter, item.slope || 113, item.rating || 72, item.par || 72);
                                                    const colorClass = hcpAfter === hcpBefore ? 'text-gray-900' : hcpAfter > hcpBefore ? 'text-green-600' : 'text-red-600';
                                                    return (
                                                        <>
                                                            {hcpBefore}
                                                            {' -> '}
                                                            <span className={`font-bold ${colorClass}`}>
                                                                {hcpAfter}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </span>
                                        </div>

                                        {/* Index */}
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-500">Idx:</span>
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <span className="text-gray-400">{item.indexBefore.toFixed(1)}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className={`font-bold ${item.indexAfter === item.indexBefore ? 'text-gray-900' :
                                                    item.indexAfter > item.indexBefore ? 'text-green-600' : 'text-red-600'
                                                    }`}>{item.indexAfter.toFixed(1)}</span>

                                                {item.isLowHi && (
                                                    <span className="ml-1 bg-blue-500 text-white text-[14pt] font-bold px-1 py-0.5 rounded">LOW HI</span>
                                                )}
                                                {item.isSoftCapped && (
                                                    <span className="ml-1 bg-yellow-500 text-white text-[14pt] font-bold px-1 py-0.5 rounded">SOFT CAP</span>
                                                )}
                                                {item.isHardCapped && (
                                                    <span className="ml-1 bg-red-500 text-white text-[14pt] font-bold px-1 py-0.5 rounded">HARD CAP</span>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {visibleRounds < data.history.length && (
                            <div className="pt-2 pb-4 text-center">
                                <button
                                    onClick={() => setVisibleRounds(prev => prev + 20)}
                                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold px-4 py-2 rounded-full text-[15pt] shadow-sm transition-all active:scale-95"
                                >
                                    Load More History ↓
                                </button>
                            </div>
                        )}
                    </div>
                ))
                }
            </div>
        </div>
    );
}

// Helpers
function calculateCourseHandicap(index: number, slope: number, rating: number, par: number) {
    // WHS: CH = Index * (Slope/113) + (CR - Par)
    const ch = index * (slope / 113) + (rating - par);
    return Math.round(ch);
}

function TeeLine({ tee, index, par }: { tee: { name: string, rating: number, slope: number }, index: number, par: number }) {
    const ch = calculateCourseHandicap(index, tee.slope, tee.rating, par);
    const displayName = tee.name;
    return (
        <div className="font-medium text-gray-600 text-[14pt]">
            <span className="text-black font-bold">{displayName}: {ch}</span>
            <span className="text-gray-400 ml-2">
                (Rating:{tee.rating} / Slope:{tee.slope})
            </span>
        </div>
    );
}
