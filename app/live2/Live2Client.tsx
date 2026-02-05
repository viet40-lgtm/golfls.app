
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiveRoundModal } from '@/components/LiveRoundModal';
import { createDefaultLiveRound, saveLiveScore } from '@/app/actions/create-live-round';

export default function Live2Client({
    currentUserId,
    isAdmin
}: {
    currentUserId: string;
    isAdmin: boolean;
}) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [activeRound, setActiveRound] = useState<any>(null);
    const [activeHole, setActiveHole] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // scores: Map<playerId, Map<holeNumber, strokes>>
    const [scores, setScores] = useState<Map<string, Map<number, number>>>(new Map());
    const [pendingScores, setPendingScores] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        // Fetch courses
        fetch('/api/courses')
            .then(res => res.json())
            .then(data => setAllCourses(data))
            .catch(err => setStatus('Failed to load courses: ' + err.message));

        // Fetch Live Data
        const today = new Date().toISOString().split('T')[0];
        fetch(`/api/live-data?date=${today}`)
            .then(res => res.json())
            .then(data => {
                if (data.activeRound) {
                    setActiveRound(data.activeRound);
                    setStatus('Active Round Found: ' + data.activeRound.name);
                }
            })
            .catch(err => console.error(err));
    }, []);

    const handleCreateDefault = async () => {
        setStatus('Creating...');
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const result = await createDefaultLiveRound(dateStr, "Test User");
            if (result.success) {
                setStatus('Success!');
                // Re-fetch to show the new round
                const today = new Date().toISOString().split('T')[0];
                const res = await fetch(`/api/live-data?date=${today}`);
                const data = await res.json();
                if (data.activeRound) setActiveRound(data.activeRound);
            } else {
                setStatus('Error: ' + result.error);
            }
        } catch (e: any) {
            setStatus('Crash: ' + e.message);
        }
    };

    // Sync local scores with activeRound data when it loads
    useEffect(() => {
        if (activeRound?.players) {
            const initialScores = new Map();
            activeRound.players.forEach((p: any) => {
                const playerScores = new Map();
                if (p.scores) {
                    p.scores.forEach((s: any) => {
                        if (s.hole?.holeNumber) {
                            playerScores.set(s.hole.holeNumber, s.strokes);
                        }
                    });
                }
                initialScores.set(p.id, playerScores);
            });
            setScores(initialScores);
        }
    }, [activeRound]);

    // --- Scoring Logic ---
    const getScore = (playerId: string, holeNumber: number) => {
        const pending = pendingScores.get(playerId);
        if (pending !== undefined) return pending;

        const playerScores = scores.get(playerId);
        return playerScores?.get(holeNumber);
    };

    const updateScore = (playerId: string, increment: boolean) => {
        const currentScore = getScore(playerId, activeHole) || 4; // Default to par 4
        const newScore = increment ? currentScore + 1 : Math.max(1, currentScore - 1);
        setPendingScores(prev => new Map(prev).set(playerId, newScore));
    };

    const handleSaveHole = async () => {
        if (!activeRound || isSaving) return;
        setIsSaving(true);
        setStatus('Saving Hole ' + activeHole + '...');

        try {
            const updates = activeRound.players.map((p: any) => {
                const pid = p.id; // LiveRoundPlayer ID
                const strokes = getScore(pid, activeHole) || 4;
                return { playerId: pid, strokes };
            });

            const result = await saveLiveScore({
                liveRoundId: activeRound.id,
                holeNumber: activeHole,
                playerScores: updates
            });

            if (result.success) {
                // Update local scores state optimistically
                setScores(prev => {
                    const next = new Map(prev);
                    updates.forEach((u: any) => {
                        const pScores = new Map(next.get(u.playerId) || []);
                        pScores.set(activeHole, u.strokes);
                        next.set(u.playerId, pScores);
                    });
                    return next;
                });
                setPendingScores(new Map());
                setStatus('Hole ' + activeHole + ' Saved!');
                // Auto-advance hole
                if (activeHole < 18) setActiveHole(activeHole + 1);
            } else {
                setStatus('Save Failed: ' + result.error);
            }
        } catch (e: any) {
            setStatus('Save Crash: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl border-4 border-black text-center space-y-4">
            <div className="text-xl font-bold">Live 2 Control Center</div>

            <div className="flex flex-col gap-4">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-black text-white px-8 py-4 rounded-xl text-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                >
                    New Round
                </button>

                <div className="h-px bg-gray-200 my-2"></div>

                <div className="text-sm text-gray-400">Debug Tools</div>
                <button
                    onClick={handleCreateDefault}
                    className="bg-green-600/20 text-green-700 border border-green-600 px-4 py-2 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-all text-sm"
                >
                    Quick Create Default
                </button>
            </div>

            {activeRound && (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="bg-black text-white p-4 rounded-2xl shadow-xl flex justify-between items-center">
                        <div className="text-left">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{activeRound.name}</h2>
                            <p className="text-zinc-400 font-bold uppercase text-xs">{activeRound.courseName}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black">Hole {activeHole}</div>
                            <div className="text-xs font-bold uppercase text-zinc-400">Par {activeRound.par}</div>
                        </div>
                    </div>

                    {/* Hole Selector */}
                    <div className="grid grid-cols-6 gap-1">
                        {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                            <button
                                key={h}
                                onClick={() => setActiveHole(h)}
                                className={`py-2 rounded-xl font-black transition-all ${activeHole === h ? 'bg-blue-600 text-white scale-105 shadow-lg' : 'bg-gray-100 text-zinc-400 hover:bg-gray-200'}`}
                            >
                                {h}
                            </button>
                        ))}
                    </div>

                    {/* Scoring List */}
                    <div className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-4 space-y-4">
                            {activeRound.players.map((p: any) => {
                                const pid = p.id;
                                const currentScore = getScore(pid, activeHole) || 4;
                                const name = p.player?.name || p.guestName || "Player";

                                return (
                                    <div key={pid} className="flex justify-between items-center border-b last:border-0 border-zinc-100 pb-2 last:pb-0">
                                        <div className="text-left">
                                            <div className="font-black text-xl italic uppercase tracking-tighter text-zinc-900">{name}</div>
                                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{p.courseHandicap ? `HCP: ${p.courseHandicap}` : ''}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => updateScore(pid, false)}
                                                className="w-12 h-12 rounded-full border-4 border-black font-black text-2xl active:scale-90 transition-all"
                                            >
                                                -
                                            </button>
                                            <div className="text-4xl font-black italic w-10 text-center">{currentScore}</div>
                                            <button
                                                onClick={() => updateScore(pid, true)}
                                                className="w-12 h-12 rounded-full border-4 border-black font-black text-2xl active:scale-90 transition-all bg-black text-white"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={handleSaveHole}
                            disabled={isSaving}
                            className="w-full bg-blue-600 text-white py-6 text-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : `Save Hole ${activeHole}`}
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-4 p-4 bg-gray-50 font-mono text-sm break-all">
                Status: {status}
            </div>

            {/* Real Modal */}
            <LiveRoundModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                allCourses={allCourses}
                showAlert={(title, msg) => alert(`${title}: ${msg}`)}
                defaultTeeBoxId={undefined}
                currentUserId={currentUserId}
            />
        </div>
    );
}
