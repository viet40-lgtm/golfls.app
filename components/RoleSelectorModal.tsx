'use client';

import { UserCircle, Eye, ChevronRight } from 'lucide-react';

interface RoleSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRole: (role: 'scorer' | 'viewer') => void;
    courseName?: string;
}

export function RoleSelectorModal({ isOpen, onClose, onSelectRole, courseName }: RoleSelectorModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter leading-none">Choose Your Role</h2>
                        <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest">{courseName || 'Live Round'}</p>
                    </div>

                    <div className="space-y-4">
                        {/* Scorer Option */}
                        <button
                            onClick={() => onSelectRole('scorer')}
                            className="w-full group relative flex items-center p-5 bg-zinc-900 hover:bg-black text-white rounded-3xl transition-all active:scale-[0.98] shadow-xl hover:shadow-zinc-900/20"
                        >
                            <div className="bg-white/10 p-3 rounded-2xl mr-4 group-hover:bg-white/20 transition-colors">
                                <UserCircle size={28} className="text-white" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="text-xl font-black italic uppercase tracking-tighter">Scorer</div>
                                <div className="text-white/50 text-xs font-bold uppercase tracking-wide">Enter scores & manage group</div>
                            </div>
                            <ChevronRight className="text-white/30 group-hover:text-white transition-colors" />
                        </button>

                        {/* Viewer Option */}
                        <button
                            onClick={() => onSelectRole('viewer')}
                            className="w-full group relative flex items-center p-5 bg-white border-2 border-zinc-100 hover:border-zinc-300 text-zinc-900 rounded-3xl transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                        >
                            <div className="bg-blue-50 p-3 rounded-2xl mr-4 group-hover:bg-blue-100 transition-colors">
                                <Eye size={28} className="text-blue-600" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="text-xl font-black italic uppercase tracking-tighter">Viewer</div>
                                <div className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Watch live leaderboard only</div>
                            </div>
                            <ChevronRight className="text-zinc-200 group-hover:text-zinc-400 transition-colors" />
                        </button>
                    </div>

                    <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                        You can change your role later in the player selection menu.
                    </p>
                </div>
            </div>
        </div>
    );
}
