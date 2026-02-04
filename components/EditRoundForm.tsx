'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { updateRound, addPlayersToRound, removePlayerFromRound, deleteRound, updatePlayerScore, createRoundWithPlayers, updateRoundPlayerTeeBox } from '@/app/actions';
import ScoreEntryModal from './ScoreEntryModal';
import ConfirmModal from './ConfirmModal';

type Player = {
    id: string;
    name: string;
    handicapIndex: number;
};

type RoundPlayer = {
    id: string;
    grossScore: number | null;
    player: Player;
    teeBox: {
        id: string;
        name: string;
        slope: number;
        rating: number;
    } | null;
    indexAtTime: number | null;
    points: number;
    payout: number;
    holeScores?: { holeId: string, strokes: number }[];
};

type RoundData = {
    id: string;
    date: string;
    name: string | null;
    isTournament: boolean;
    course: {
        id: string;
        name: string;
        holes: { par: number }[];
        teeBoxes: { id: string; name: string; slope: number; rating: number }[];
    };
    players: RoundPlayer[];
};

export default function EditRoundForm({
    round,
    allPlayers,
    allCourses
}: {
    round: RoundData;
    allPlayers: Player[];
    allCourses?: { id: string; name: string; holes: { par: number }[]; teeBoxes: { id: string; name: string; slope: number; rating: number }[] }[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [date, setDate] = useState(round.date.split('T')[0]);
    const [name, setName] = useState(round.name || '');
    const [isTournament, setIsTournament] = useState(round.isTournament);

    // State for delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // State for score entry modal
    const [scoreModalOpen, setScoreModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<RoundPlayer | null>(null);

    // Selection state for adding members
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

    // Local state for players (to handle optimistic updates / new round mode)
    const [statePlayers, setStatePlayers] = useState<RoundPlayer[]>(round.players);

    // State for selected course (for new rounds)
    const [selectedCourseId, setSelectedCourseId] = useState<string>(round.course.id);
    const [currentCourse, setCurrentCourse] = useState(round.course);

    // Initial load sync
    // update statePlayers if round.players changes (e.g. after server action refresh)
    // But ONLY if not in 'new' mode or if we carefully manage it to avoid overwriting local changes?
    // Actually, for 'edit' mode, round.players from props is the source of truth after refresh.
    // For 'new' mode, props never change until save.
    const isNew = round.id === 'new';

    // If we receive new props and it's NOT a new round (or we just saved), sync state
    // We can use a key on the component to force reset, or simpler:
    // Just initialize once. For existing rounds, router.refresh() will re-render this component with new props.
    // We want to update statePlayers when props change EXCEPT when we are locally managing 'new' round.
    // Sync statePlayers with round.players when props change (for existing rounds)
    useEffect(() => {
        if (!isNew) {
            setStatePlayers(round.players);
        }
    }, [round.players, isNew]);

    // State for confirmation modal
    const [deletePassword, setDeletePassword] = useState('');
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive: boolean;
        showInput?: boolean;
        inputPlaceholder?: string;
    } | null>(null);

    // Calculate existing IDs based on STATE players
    const existingPlayerIds = new Set(statePlayers.map(rp => rp.player.id));
    const availablePlayers = allPlayers.filter(p => !existingPlayerIds.has(p.id));

    // Sort available players by Last Name
    const sortedAvailablePlayers = [...availablePlayers].sort((a, b) => {
        const lastA = a.name.split(' ').slice(1).join(' ');
        const lastB = b.name.split(' ').slice(1).join(' ');
        return lastA.localeCompare(lastB);
    });

    // Helper for Course Handicap Display in List
    const coursePar = currentCourse.holes?.reduce((sum, h) => sum + h.par, 0) || 72;
    const defaultTee = currentCourse.teeBoxes?.find(t => t.name === 'White') || currentCourse.teeBoxes?.[0];

    const getCourseHcp = (index: number) => {
        if (!defaultTee) return Math.round(index);
        return Math.round(index * (defaultTee.slope / 113) + (defaultTee.rating - coursePar));
    };

    const handleCourseChange = (courseId: string) => {
        if (!allCourses) return;

        const newCourse = allCourses.find(c => c.id === courseId);
        if (!newCourse) return;

        setSelectedCourseId(courseId);
        setCurrentCourse(newCourse);

        if (isNew) {
            // Reset players when course changes specifically for new rounds
            setStatePlayers([]);
        } else {
            // For existing rounds, we keep players but invalidate their tee boxes
            // since IDs won't match the new course
            setStatePlayers(prev => prev.map(p => ({
                ...p,
                teeBox: null
            })));
        }
    };

    const handleSaveRound = async () => {
        startTransition(async () => {
            // Fix timezone issue: append T12:00:00 to ensure date stays correct
            const dateWithTime = date.includes('T') ? date : `${date}T12:00:00`;

            if (isNew) {
                // Create new round with current players and selected course
                const playersData = statePlayers.map(p => ({
                    playerId: p.player.id,
                    teeBoxId: p.teeBox?.id,
                    gross: p.grossScore,
                    points: p.points,
                    payout: p.payout,
                    scores: p.holeScores
                }));

                await createRoundWithPlayers(
                    { date: dateWithTime, name, isTournament: isTournament, courseId: selectedCourseId },
                    playersData
                );
            } else {
                // Update existing
                const courseChanged = selectedCourseId !== round.course.id;
                await updateRound(round.id, {
                    date: dateWithTime,
                    name,
                    isTournament: isTournament,
                    courseId: courseChanged ? selectedCourseId : undefined
                });
            }

            router.push('/scores');
            router.refresh();
        });
    };

    const handleDeleteClick = () => {
        if (isNew) return;

        setDeletePassword('');
        setConfirmConfig({
            isOpen: true,
            title: 'Password Required',
            message: 'Enter password to delete this round:',
            isDestructive: true,
            showInput: true,
            inputPlaceholder: 'Password',
            onConfirm: () => {
                // actual validation in onConfirm of JSX
            }
        });
    };

    const handleAddSelected = async () => {
        if (selectedPlayerIds.size === 0) return;

        startTransition(async () => {
            // Optimistic update logic (reused for both New and Edit modes)
            const newPlayers: RoundPlayer[] = Array.from(selectedPlayerIds).map(pid => {
                const player = allPlayers.find(p => p.id === pid)!;
                const defaultTee = currentCourse.teeBoxes?.find(t => t.name === 'White') || currentCourse.teeBoxes?.[0] || null;
                return {
                    id: isNew ? `temp-${pid}` : `temp-opt-${pid}`, // temp ID for key
                    grossScore: null,
                    player: player,
                    teeBox: defaultTee,
                    indexAtTime: player.handicapIndex,
                    points: 0,
                    payout: 0
                };
            });

            // Apply optimistic update
            setStatePlayers(prev => [...prev, ...newPlayers]);
            setSelectedPlayerIds(new Set()); // Clear selection immediately

            if (isNew) {
                // Local state is enough
            } else {
                try {
                    // Server action
                    await addPlayersToRound(round.id, Array.from(selectedPlayerIds));
                    router.refresh();
                } catch (error) {
                    console.error("Failed to add players:", error);
                    alert("Failed to add players.");
                    // Revert? (Complex, rely on refresh usually)
                    router.refresh();
                }
            }
        });
    };

    const handleRemovePlayer = (roundPlayerId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Remove Player',
            message: 'Remove this player from the round?',
            isDestructive: true,
            onConfirm: () => {
                setConfirmConfig(null);

                // Optimistic update immediately
                setStatePlayers(prev => prev.filter(p => p.id !== roundPlayerId));

                startTransition(async () => {
                    if (isNew) {
                        // Already updated local state above, nothing else to do
                    } else {
                        try {
                            await removePlayerFromRound(roundPlayerId);
                            router.refresh();
                        } catch (error) {
                            console.error("Failed to remove player:", error);
                            alert("Failed to remove player. Please try again.");
                            router.refresh();
                        }
                    }
                });
            }
        });
    };

    const handleTeeBoxChange = async (roundPlayerId: string, teeBoxId: string) => {
        const selectedTee = currentCourse.teeBoxes.find(t => t.id === teeBoxId);
        if (!selectedTee) return;

        startTransition(async () => {
            if (isNew) {
                setStatePlayers(prev => prev.map(p => {
                    if (p.id === roundPlayerId) {
                        return {
                            ...p,
                            teeBox: selectedTee
                        };
                    }
                    return p;
                }));
            } else {
                // Determine optimistic update or just refresh
                // Let's do optimistic for better feel, though router.refresh is safest
                // But since we are inside a map, we can't easily set state for just one unless we switch to full local state sync
                // For now, rely on router.refresh() but maybe show spinner?
                // Actually startTransition handles the loading UI if we used isPending everywhere, but we don't on the select
                await updateRoundPlayerTeeBox(roundPlayerId, teeBoxId);
                router.refresh();
            }
        });
    };

    const togglePlayerSelection = (playerId: string) => {
        const newSet = new Set(selectedPlayerIds);
        if (newSet.has(playerId)) {
            newSet.delete(playerId);
        } else {
            newSet.add(playerId);
        }
        setSelectedPlayerIds(newSet);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Round Details Section */}
            <div className="p-3 border-b border-gray-200 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-[14pt] font-bold text-gray-900">Add/Edit Round</h2>
                    <div className="flex gap-2">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex gap-2">
                                {!isNew && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteClick}
                                        disabled={isPending}
                                        className="bg-red-600 hover:bg-red-700 text-white text-[15pt] font-bold px-4 py-2 rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        {isPending ? 'Deleting...' : 'Delete Round'}
                                    </button>
                                )}
                                <Link href="/scores" className="bg-black text-white px-4 py-2 rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 flex items-center">
                                    {isNew ? 'Cancel' : 'Close'}
                                </Link>
                            </div>
                            {errorMessage && <span className="text-red-600 text-[14pt] font-bold">{errorMessage}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            title="Round Date"
                            className="w-full border border-gray-300 rounded px-1 py-2 text-[14pt]"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    {allCourses && allCourses.length > 1 && (
                        <div>
                            <label className="block text-[14pt] font-bold text-gray-700 mb-1">Course</label>
                            <select
                                className="w-full border border-gray-300 rounded px-1 py-2 text-[14pt]"
                                title="Select Course"
                                value={selectedCourseId}
                                onChange={(e) => handleCourseChange(e.target.value)}
                            >
                                {allCourses.map(course => (
                                    <option key={course.id} value={course.id}>{course.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            title="Tournament/Round Name"
                            placeholder="e.g. Sunday Game"
                            className="w-full border border-gray-300 rounded px-1 py-2 text-[14pt]"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="tournament"
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            checked={isTournament}
                            onChange={(e) => setIsTournament(e.target.checked)}
                        />
                        <label htmlFor="tournament" className="text-[14pt] text-gray-700">Tournament (with Flight 1 & 2)</label>
                    </div>
                </div>
            </div>

            {/* Add Players Section */}
            <div className="p-3 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-bold text-[14pt] text-gray-900 mb-3">Add Players to Round/Tournament</h3>
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-1">
                    {/* List Added Players (Disabled) */}
                    {statePlayers.map(rp => (
                        <div key={rp.id} className="flex items-center gap-2 px-1 py-1.5 opacity-50">
                            <input type="checkbox" checked disabled className="rounded border-gray-300" />
                            <span className="text-[14pt] text-gray-500">
                                {rp.player.name} <span className="text-[14pt]">(HCP: {Math.round(rp.player.handicapIndex)})</span>
                                <span className="ml-2 text-[14pt] font-bold">(Added)</span>
                            </span>
                        </div>
                    ))}

                    {/* List Available Players */}
                    {sortedAvailablePlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-1 py-1.5 hover:bg-gray-50">
                            <input
                                type="checkbox"
                                id={`player-${p.id}`}
                                title={`Select ${p.name}`}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                checked={selectedPlayerIds.has(p.id)}
                                onChange={() => togglePlayerSelection(p.id)}
                            />
                            <label htmlFor={`player-${p.id}`} className="text-[14pt] text-gray-900 cursor-pointer w-full">
                                {p.name} <span className="text-gray-400 text-[14pt]">(HCP: {getCourseHcp(p.handicapIndex)})</span>
                            </label>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleAddSelected}
                    disabled={selectedPlayerIds.size === 0 || isPending}
                    className="mt-3 w-full bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-full text-[15pt] transition-colors"
                >
                    Add Selected Players ({selectedPlayerIds.size})
                </button>
            </div>

            {/* Players in Round Table */}
            <div className="p-3">
                <h3 className="font-bold text-[14pt] text-gray-900 mb-3">Players in This Round</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[14pt]">
                        <thead className="text-[14pt] text-black uppercase font-bold border-b border-gray-200">
                            <tr>
                                <th className="py-2 text-left">Player</th>
                                <th className="py-2 text-center">Tee Box</th>
                                <th className="py-2 text-center">Gross</th>
                                <th className="py-2 text-center">HCP</th>
                                <th className="py-2 text-center">Net</th>
                                <th className="py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {statePlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-4 text-center text-gray-500 italic">No players in this round yet.</td>
                                </tr>
                            ) : (
                                statePlayers.map(rp => {
                                    const gross = rp.grossScore;
                                    // Calc logic duplicate from Scores page - ideally centralize
                                    const idx = rp.indexAtTime ?? rp.player.handicapIndex;
                                    const slope = rp.teeBox?.slope ?? 113;
                                    const rating = rp.teeBox?.rating ?? 0; // If no tee, use 0 to signal invalid
                                    const coursePar = currentCourse.holes?.reduce((sum, h) => sum + h.par, 0) || 72;

                                    let courseHcp = 0;
                                    if (rp.teeBox) {
                                        courseHcp = Math.round(idx * (slope / 113) + (rating - coursePar));
                                    } else {
                                        // If no tee box, just show Base Index? Or 0?
                                        // Showing Index serves as a reasonable proxy until Tee is picked
                                        courseHcp = Math.round(idx);
                                    }
                                    const net = gross ? gross - courseHcp : null;

                                    return (
                                        <tr key={rp.id} className="group hover:bg-gray-50">
                                            <td className="py-3 font-medium">{rp.player.name}</td>
                                            <td className="py-3 text-center">
                                                <select
                                                    className="border-none bg-transparent text-center font-medium focus:ring-2 focus:ring-blue-500 rounded p-1 cursor-pointer"
                                                    title="Select Tee Box"
                                                    value={rp.teeBox?.id || ''}
                                                    onChange={(e) => handleTeeBoxChange(rp.id, e.target.value)}
                                                    disabled={isPending}
                                                >
                                                    {!rp.teeBox && <option value="">Select Tee</option>}
                                                    {currentCourse.teeBoxes?.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3 text-center">{gross ?? '-'}</td>
                                            <td className="py-3 text-center">{courseHcp}</td>
                                            <td className="py-3 text-center font-bold">{net ?? '-'}</td>
                                            <td className="py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {

                                                            setSelectedPlayer(rp);
                                                            setScoreModalOpen(true);
                                                        }}
                                                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                        title="Edit Score"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemovePlayer(rp.id)}
                                                        className="px-4 py-2 bg-red-600 text-white rounded-full text-[15pt] font-bold hover:bg-red-700 transition-all shadow-md active:scale-95"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sticky Save Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 sticky bottom-0">
                <button
                    onClick={handleSaveRound}
                    disabled={isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-full shadow-md transition-all active:scale-95 text-[15pt]"
                >
                    {isPending ? 'Saving...' : (isNew ? 'Create Round' : 'Save & Update Round')}
                </button>
            </div>

            {/* Score Entry Modal */}
            {selectedPlayer && (
                <ScoreEntryModal
                    isOpen={scoreModalOpen}
                    onClose={() => {
                        setScoreModalOpen(false);
                        setSelectedPlayer(null);
                    }}
                    playerName={selectedPlayer.player.name}
                    courseName={currentCourse.name}
                    courseId={currentCourse.id}
                    roundPlayerId={selectedPlayer.id}
                    currentGross={selectedPlayer.grossScore}
                    currentFront={null}
                    currentBack={null}
                    currentPoints={selectedPlayer.points}
                    currentPayout={selectedPlayer.payout}
                    playerIndex={selectedPlayer.player.handicapIndex}
                    indexAtTime={selectedPlayer.indexAtTime}
                    teeBox={selectedPlayer.teeBox}
                    coursePar={currentCourse.holes?.reduce((sum, h) => sum + h.par, 0)}
                    onSave={async (gross, front, back, pts, pay, holeScores) => {
                        const courseChanged = existingPlayerIds.size > 0 && currentCourse.id !== round.course.id;

                        // If it's a new round OR the course has changed (which makes db incompatible), save locally
                        if (isNew || courseChanged) {
                            // Update local state
                            setStatePlayers(prev => prev.map(p => {
                                if (p.id === selectedPlayer.id) {
                                    return {
                                        ...p,
                                        grossScore: gross,
                                        points: pts,
                                        payout: pay,
                                        holeScores: holeScores
                                    };
                                }
                                return p;
                            }));
                        } else {
                            // For existing rounds with same course, save to database directly
                            await updatePlayerScore(selectedPlayer.id, gross, front, back, pts, pay, holeScores);
                            router.refresh();
                        }
                    }}
                />
            )}

            {/* Confirmation Modal */}
            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDestructive={confirmConfig.isDestructive}
                    showInput={confirmConfig.showInput}
                    inputPlaceholder={confirmConfig.inputPlaceholder}
                    inputValue={deletePassword}
                    onInputChange={setDeletePassword}
                    onConfirm={() => {
                        if (confirmConfig.showInput) {
                            if (deletePassword === 'cpgc-Delete') {
                                setConfirmConfig({
                                    isOpen: true,
                                    title: 'Delete Round',
                                    message: 'Are you sure you want to DELETE this round? This cannot be undone.',
                                    isDestructive: true,
                                    onConfirm: () => {
                                        setConfirmConfig(null);
                                        setErrorMessage('');

                                        startTransition(async () => {
                                            try {
                                                await deleteRound(round.id);
                                                router.push('/scores');
                                                router.refresh();
                                            } catch (e) {
                                                console.error('Delete failed:', e);
                                                setErrorMessage('Failed to delete. Error: ' + e);
                                            }
                                        });
                                    }
                                });
                            } else {
                                setConfirmConfig({
                                    isOpen: true,
                                    title: 'Error',
                                    message: 'Incorrect password.',
                                    isDestructive: false,
                                    onConfirm: () => setConfirmConfig(null)
                                });
                            }
                        } else {
                            confirmConfig.onConfirm();
                        }
                    }}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}

