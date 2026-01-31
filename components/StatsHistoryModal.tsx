'use client';

import { format } from 'date-fns';
import { X } from 'lucide-react';

interface StatsHistoryItem {
    date: string;
    roundName?: string;
    amount: number;
    isTournament?: boolean;
}

interface StatsHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    playerName: string;
    type: 'points' | 'money';
    history: StatsHistoryItem[];
}

export function StatsHistoryModal({ isOpen, onClose, playerName, type, history }: StatsHistoryModalProps) {
    if (!isOpen) return null;

    // Sort history by date descending
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const total = sortedHistory.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="bg-slate-50 border-b border-gray-100 px-1 py-4 flex justify-between items-center shrink-0 safe-top">
                <div className="flex flex-col">
                    <h2 className="text-[14pt] font-black text-gray-900 leading-tight ml-3">
                        {playerName}
                    </h2>
                    <p className="text-[14pt] text-blue-600 font-bold ml-3">
                        {type === 'points' ? 'Points History' : 'Winnings History'}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                >
                    Close
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-1 py-4 bg-slate-50">
                {sortedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <p className="text-[14pt] text-gray-400 font-medium">No recorded {type === 'points' ? 'points' : 'winnings'}.</p>
                    </div>
                ) : (
                    <div className="space-y-4 w-full">
                        {sortedHistory.map((item, idx) => {
                            const dateStr = format(new Date(item.date), 'MMM d, yyyy');
                            let label = item.roundName || 'Regular Round';
                            if (item.isTournament && !item.roundName) label = 'Tournament';
                            if (item.isTournament && item.roundName) label = `${item.roundName} (T)`;

                            return (
                                <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 relative overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-gray-900 text-[14pt]">
                                                {dateStr}
                                            </span>
                                            <span className="text-[14pt] text-gray-500 font-medium">
                                                {label}
                                            </span>
                                        </div>
                                        <div className={`font-black text-[14pt] leading-none ${type === 'money' ? 'text-green-600' : 'text-blue-600'}`}>
                                            {type === 'money' ? `$${item.amount.toFixed(2)}` : item.amount}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Total */}
            <div className="border-t border-gray-100 p-6 bg-slate-50 flex justify-between items-center shrink-0 safe-bottom">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[14pt]">Total</span>
                <span className={`text-[14pt] font-black ${type === 'money' ? 'text-green-600' : 'text-blue-600'}`}>
                    {type === 'money' ? `$${total.toFixed(2)}` : total}
                </span>
            </div>
        </div>
    );
}
