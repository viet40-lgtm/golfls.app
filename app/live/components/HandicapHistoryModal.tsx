'use client';

import React, { useEffect, useState } from 'react';
import { getHandicapHistory, HandicapHistoryResponse } from '../actions/get-handicap-history';
import { format } from 'date-fns';
import { X } from 'lucide-react';

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
            <div className="fixed inset-0 z-[500] flex flex-col bg-white animate-in fade-in items-center justify-center p-4">
                <div className="text-red-600 text-[16pt] font-bold mb-4">Error Loading History</div>
                <div className="text-gray-700 mb-6">{error}</div>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-black text-white rounded-full text-[15pt] font-bold"
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
            const datePart = (() => {
                const d = new Date(item.date);
                return format(d, 'MM/dd/yy');
            })();

            html += `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0;">
                        <span style="font-weight: bold;">${datePart}</span>
                        ${item.usedForCurrent ? ' <br><span style="color: #16a34a; font-size: 10px; font-weight: bold;">[USED]</span>' : ''}
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
            alert('History copied to clipboard!');
        } catch (e) {
            console.error(e);
            alert('Failed to copy');
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="bg-slate-50 border-b border-gray-100 px-3 py-3 flex justify-between items-center shrink-0 safe-top">
                <div className="flex flex-col">
                    <h2 className="text-[12pt] font-black text-gray-900 leading-tight truncate max-w-[150px] sm:max-w-none">
                        {data?.player.name || 'Loading...'}
                    </h2>
                    <p className="text-[12pt] text-blue-600 font-bold">Handicap History</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleCopyFullHistory}
                        className="p-1.5 bg-black hover:bg-gray-800 rounded-full transition-colors flex items-center justify-center"
                        title="Copy Full History"
                    >
                        <CopyIcon size={20} className="text-white" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                        title="Close"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <LoaderIcon className="w-8 h-8 animate-spin text-green-600" />
                        <p className="text-[14pt] text-gray-400 font-medium">Calculating Handicap History...</p>
                    </div>
                ) : (data && (
                    <div className="space-y-6 w-full max-w-2xl mx-auto">

                        {/* Official Handicap Card */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center shadow-sm">
                            <h3 className="font-bold text-gray-900 text-[12pt] mb-2 uppercase tracking-tight">Official Handicap Index</h3>
                            <div className="text-[24pt] font-black text-gray-900 mb-6 leading-none">
                                {data.player.currentIndex.toFixed(1)}
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                                <div className="text-center">
                                    <div className="text-[10pt] font-bold text-gray-400 uppercase">Low Index</div>
                                    <div className="text-[14pt] font-bold text-gray-900">{data.player.lowIndex !== null ? data.player.lowIndex.toFixed(1) : 'N/A'}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10pt] font-bold text-gray-400 uppercase">Tee Box</div>
                                    <div className="text-[14pt] font-bold text-gray-900">{data.player.preferredTee || 'White'}</div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                                <p className="font-bold text-blue-900 mb-3 text-[12pt] uppercase tracking-wide">Estimated Course Handicaps</p>
                                <div className="flex flex-col gap-2">
                                    {data.courseData.tees.map(t => (
                                        <TeeLine key={t.name} tee={t} index={data.player.currentIndex} par={data.courseData.par} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Scoring Record Header */}
                        <div>
                            <h3 className="font-bold text-gray-900 text-[14pt] uppercase tracking-tight">Recent Scoring Record</h3>
                            <p className="text-[11pt] text-gray-500 font-medium italic">Best 8 of most recent 20 differentials are used</p>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {data.history.slice(0, visibleRounds).map((item) => (
                                <div key={item.id} className={`bg-white rounded-xl border-2 ${item.usedForCurrent ? 'border-green-500 shadow-md' : 'border-gray-200 shadow-sm'} p-4 relative overflow-hidden`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 text-[14pt]">
                                                {format(new Date(item.date), 'MMM d, yyyy')}
                                            </span>
                                            {item.usedForCurrent && (
                                                <span className="bg-green-600 text-white text-[9pt] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">USED</span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10pt] font-bold text-gray-400 uppercase">Differential</div>
                                            <div className="font-black text-gray-900 text-[16pt] leading-none">
                                                {item.differential.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end border-t border-gray-50 pt-3">
                                        <div className="text-[12pt] text-gray-500 font-medium italic">
                                            {item.gross ? `Gross: ${item.gross}` : 'Historical Differential'}
                                            {item.adjusted && item.adjusted !== item.gross && ` (Adj: ${item.adjusted})`}
                                            <br />
                                            {item.teeColor || 'Est'} Tee • {item.rating}/{item.slope}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10pt] font-bold text-gray-400 uppercase">Index Change</div>
                                            <div className="font-bold text-[13pt] text-gray-900">
                                                {item.indexBefore.toFixed(1)} → <span className={item.indexAfter < item.indexBefore ? 'text-red-600' : item.indexAfter > item.indexBefore ? 'text-green-600' : ''}>{item.indexAfter.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {item.isLowHi && (
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-blue-600 text-white text-[8pt] font-black px-3 py-1 rotate-45 translate-x-4 -translate-y-1 w-16 text-center">LOW</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Load More */}
                        {visibleRounds < data.history.length && (
                            <button
                                onClick={() => setVisibleRounds(v => v + 20)}
                                className="w-full bg-white border-2 border-gray-200 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
                            >
                                Load More Rounds
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TeeLine({ tee, index, par }: { tee: { name: string, rating: number, slope: number }, index: number, par: number }) {
    const ch = Math.round(index * (tee.slope / 113) + (tee.rating - par));
    return (
        <div className="flex justify-between items-center text-[13pt]">
            <span className="font-bold text-gray-700">{tee.name}</span>
            <span className="font-black text-gray-900">{ch} HCP</span>
        </div>
    );
}

function calculateCourseHandicap(index: number, slope: number, rating: number, par: number) {
    return Math.round(index * (slope / 113) + (rating - par));
}
