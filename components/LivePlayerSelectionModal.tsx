'use client';

import { useState, useEffect, useRef } from 'react';
import { createPlayer } from '@/app/actions';
import ConfirmModal from './ConfirmModal';

interface Player {
    id: string;
    name: string;
    index?: number;
    preferred_tee_box?: string | null;
    phone?: string | null;
    player_id?: string | null;
}

interface TeeBox {
    id: string;
    name: string;
    rating: number;
    slope: number;
}

export type PlayerMode = 'score' | 'leaderboard' | 'none';

// New dual-checkbox selection type
export type PlayerSelection = {
    score: boolean;
    leaderboard: boolean;
};

export function LivePlayerSelectionModal({
    allPlayers,
    playerModes,
    playerSelections,
    playersInRound = [],
    onPlayerModesChange,
    onPlayerSelectionsChange,
    isOpen,
    onClose,
    courseData,
    isAdmin = false,
    frequentPlayerIds = [],
    currentUserId,
    hasMultipleGroups = false
}: {
    allPlayers: Player[];
    playerModes?: Record<string, PlayerMode>; // Legacy support
    playerSelections?: Record<string, PlayerSelection>; // New dual-checkbox
    playersInRound?: string[];
    onPlayerModesChange?: (modes: Record<string, PlayerMode>) => void; // Legacy
    onPlayerSelectionsChange?: (selections: Record<string, PlayerSelection>) => void; // New
    isOpen: boolean;
    onClose: () => void;
    courseData?: {
        courseName: string;
        teeBoxes: TeeBox[];
        par: number;
        roundTeeBox?: {
            rating: number;
            slope: number;
        } | null;
    } | null;
    isAdmin?: boolean;
    frequentPlayerIds?: string[];
    currentUserId?: string;
    hasMultipleGroups?: boolean;
}) {
    // Determine if using new dual-checkbox mode or legacy mode
    const useDualCheckbox = !!onPlayerSelectionsChange;

    // Legacy mode state
    const [localPlayerModes, setLocalPlayerModes] = useState<Record<string, PlayerMode>>(playerModes || {});

    // New dual-checkbox state
    const [localPlayerSelections, setLocalPlayerSelections] = useState<Record<string, PlayerSelection>>(playerSelections || {});
    const [searchQuery, setSearchQuery] = useState('');
    const [localAllPlayers, setLocalAllPlayers] = useState<Player[]>(allPlayers);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPlayerError, setNewPlayerError] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const [newPlayer, setNewPlayer] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        handicapIndex: '0'
    });

    // Sync local state with prop only when modal opens
    useEffect(() => {
        if (isOpen) {
            if (useDualCheckbox) {
                setLocalPlayerSelections(playerSelections || {});
            } else {
                setLocalPlayerModes(playerModes || {});
            }
            setLocalAllPlayers(allPlayers);
            setIsCreating(false);
            setNewPlayerError('');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, allPlayers, playerModes, playerSelections, useDualCheckbox]);

    // Sync local state when props change
    useEffect(() => {
        if (useDualCheckbox) {
            setLocalPlayerSelections(playerSelections || {});
        } else {
            setLocalPlayerModes(playerModes || {});
        }
    }, [playerSelections, playerModes, useDualCheckbox]);

    if (!isOpen) return null;

    // Dual-checkbox helper functions
    const getPlayerSelection = (id: string): PlayerSelection => {
        return localPlayerSelections[id] || { score: false, leaderboard: false };
    };

    const toggleScore = (id: string) => {
        setLocalPlayerSelections(prev => {
            const current = getPlayerSelection(id);
            return {
                ...prev,
                [id]: { score: !current.score, leaderboard: current.leaderboard || !current.score }
            };
        });
    };

    const toggleLeaderboard = (id: string) => {
        setLocalPlayerSelections(prev => {
            const current = getPlayerSelection(id);
            return {
                ...prev,
                [id]: { ...current, leaderboard: !current.leaderboard }
            };
        });
    };

    const removePlayer = (id: string) => {
        console.log("Marking player for removal:", id);
        setLocalPlayerSelections(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const setPlayerMode = (id: string, mode: PlayerMode) => {
        if (useDualCheckbox) {
            if (mode === 'none') {
                removePlayer(id);
            } else {
                setLocalPlayerSelections(prev => ({
                    ...prev,
                    [id]: { score: mode === 'score', leaderboard: true }
                }));
            }
        } else {
            setLocalPlayerModes(prev => {
                const next = { ...prev };
                if (mode === 'none') {
                    delete next[id];
                } else {
                    next[id] = mode;
                }
                return next;
            });
        }
    };

    const getPlayerMode = (id: string): PlayerMode => {
        if (useDualCheckbox) {
            const sel = getPlayerSelection(id);
            if (sel.score) return 'score';
            if (sel.leaderboard) return 'leaderboard';
            return 'none';
        }
        return localPlayerModes[id] || 'none';
    };

    const handleConfirm = () => {
        if (useDualCheckbox && onPlayerSelectionsChange) {
            onPlayerSelectionsChange(localPlayerSelections);
        } else if (onPlayerModesChange) {
            onPlayerModesChange(localPlayerModes);
        }
        onClose();
    };

    const handleCreatePlayer = async () => {
        setNewPlayerError('');
        if (!newPlayer.firstName || !newPlayer.lastName) {
            setNewPlayerError('First and Last Name are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const indexValue = parseFloat(newPlayer.handicapIndex);

            const created = await createPlayer({
                firstName: newPlayer.firstName,
                lastName: newPlayer.lastName,
                email: newPlayer.email,
                phone: newPlayer.phone,
                handicapIndex: isNaN(indexValue) ? 0 : indexValue
            });

            // Add to local list
            const newPlayerObj: Player = {
                id: created.id,
                name: created.name,
                index: created.handicapIndex,
                preferred_tee_box: created.preferredTeeBox,
                phone: created.phone,
                player_id: created.playerId
            };

            setLocalAllPlayers(prev => [...prev, newPlayerObj]);
            // Automatically select the new player for scoring & leaderboard
            if (useDualCheckbox) {
                setLocalPlayerSelections(prev => ({
                    ...prev,
                    [created.id]: { score: true, leaderboard: true }
                }));
            } else {
                setLocalPlayerModes(prev => ({ ...prev, [created.id]: 'score' }));
            }

            setIsCreating(false);
            setSearchQuery(''); // Clear search to show context or just done
            setNewPlayer({ firstName: '', lastName: '', email: '', phone: '', handicapIndex: '0' });
        } catch (err: any) {
            setNewPlayerError(err.message || "Failed to create player.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter Logic for Dropdown
    const searchResults = searchQuery ? localAllPlayers.filter(p => {
        // Exclude current user from search results
        if (currentUserId && p.id === currentUserId) return false;

        // Exclude players already in the round
        const mode = getPlayerMode(p.id);
        if (mode !== 'none') return false;

        const q = searchQuery.toLowerCase();
        const last4 = p.phone ? p.phone.slice(-4) : '';
        const playerId = p.player_id ? p.player_id.toLowerCase() : '';
        return p.name.toLowerCase().includes(q) || last4.includes(q) || playerId.includes(q);
    }) : [];

    const sortedAllPlayers = [...localAllPlayers]
        .filter(p => !currentUserId || p.id !== currentUserId) // Exclude current user
        .sort((a, b) => {
            if (useDualCheckbox) {
                // New dual-checkbox sorting
                const aSelection = getPlayerSelection(a.id);
                const bSelection = getPlayerSelection(b.id);

                const aSelected = aSelection.score || aSelection.leaderboard;
                const bSelected = bSelection.score || bSelection.leaderboard;

                // Priority 1: Selected players first
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;

                // Priority 2: Within selected, score players first
                if (aSelected && bSelected) {
                    if (aSelection.score && !bSelection.score) return -1;
                    if (!aSelection.score && bSelection.score) return 1;
                }
            } else {
                // Legacy mode sorting
                const aModeScore = getPlayerMode(a.id) === 'score';
                const bModeScore = getPlayerMode(b.id) === 'score';
                if (aModeScore && !bModeScore) return -1;
                if (!aModeScore && bModeScore) return 1;

                const aModeLeaderboard = getPlayerMode(a.id) === 'leaderboard';
                const bModeLeaderboard = getPlayerMode(b.id) === 'leaderboard';
                if (aModeLeaderboard && !bModeLeaderboard) return -1;
                if (!aModeLeaderboard && bModeLeaderboard) return 1;
            }

            // Priority 3: Frequent players
            const isAFrequent = frequentPlayerIds?.includes(a.id);
            const isBFrequent = frequentPlayerIds?.includes(b.id);
            if (isAFrequent && !isBFrequent) return -1;
            if (!isAFrequent && isBFrequent) return 1;

            // Priority 4: Alphabetical by Last Name
            const aLastName = a.name.split(' ').pop() || a.name;
            const bLastName = b.name.split(' ').pop() || b.name;
            return aLastName.localeCompare(bLastName);
        });

    // Filter Logic for Main Body (only show group members or suggestions)
    const groupPlayers = sortedAllPlayers.filter(p => {
        const sel = getPlayerSelection(p.id);
        const mode = getPlayerMode(p.id);
        const isSelected = useDualCheckbox ? (sel.score || sel.leaderboard) : (mode !== 'none');
        return isSelected;
    });

    // Suggestions (Frequent players not already in the group)
    const suggestions = sortedAllPlayers.filter(p => {
        const isInGroup = groupPlayers.some(gp => gp.id === p.id);
        return !isInGroup && frequentPlayerIds?.includes(p.id);
    });

    // Determine course handicap
    const getCourseHandicap = (player: Player): number | null => {
        if (player.index === undefined || !courseData) return null;

        const teeBox = courseData.roundTeeBox ||
            (player.preferred_tee_box
                ? courseData.teeBoxes.find(t => t.name.toLowerCase().includes(player.preferred_tee_box!.toLowerCase()))
                : courseData.teeBoxes[0]);

        if (!teeBox) return null;

        const courseHcp = Math.round(player.index * (teeBox.slope / 113) + (teeBox.rating - courseData.par));
        return courseHcp;
    };

    // Count selected players
    const scoreCount = useDualCheckbox
        ? Object.values(localPlayerSelections).filter(s => s.score).length
        : Object.values(localPlayerModes).filter(m => m === 'score').length;
    const leaderboardCount = useDualCheckbox
        ? Object.values(localPlayerSelections).filter(s => s.leaderboard).length
        : Object.values(localPlayerModes).filter(m => m === 'leaderboard').length;
    const totalSelected = scoreCount + leaderboardCount;

    // Check if modes have changed
    const hasChanges = useDualCheckbox
        ? JSON.stringify(localPlayerSelections) !== JSON.stringify(playerSelections)
        : JSON.stringify(localPlayerModes) !== JSON.stringify(playerModes);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm">
            {/* Full Screen Panel */}
            <div className="w-full h-full max-w-full overflow-hidden bg-gray-50 shadow-2xl flex flex-col">
                {/* Scrollable Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="p-1 bg-white flex flex-col gap-1 shadow-sm z-10 flex-1 h-full">
                        <div className="flex justify-between items-center">
                            <h2 className="text-[16pt] font-bold text-left ml-1">
                                {isCreating ? "Create New Player" : "Search player:"}
                            </h2>
                            {/* Close button removed as requested */}
                        </div>


                        {!isCreating && (
                            <div className="relative flex items-stretch gap-2" ref={searchRef}>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Search by First/Last Name"
                                        title="Search players"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full text-[14pt] h-[48px] p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-black bg-white shadow-sm transition-all"
                                    />
                                    {searchQuery && (
                                        <div className="absolute top-full left-0 w-full bg-white border-2 border-gray-200 rounded-xl mt-2 max-h-[55vh] overflow-y-auto z-50 shadow-2xl">
                                            {searchResults.length === 0 ? (
                                                <div className="p-4 text-center text-gray-500">No matching players</div>
                                            ) : (
                                                searchResults.map(p => {
                                                    const mode = getPlayerMode(p.id);
                                                    return (
                                                        <button
                                                            key={'search-' + p.id}
                                                            onClick={() => {
                                                                if (useDualCheckbox) {
                                                                    setLocalPlayerSelections(prev => ({
                                                                        ...prev,
                                                                        [p.id]: { score: true, leaderboard: true }
                                                                    }));
                                                                } else {
                                                                    setPlayerMode(p.id, 'score');
                                                                }
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full text-left p-1 border-b border-gray-100 last:border-0 hover:bg-blue-50 flex items-center justify-between"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-lg text-black">{p.name}</span>
                                                                <span className="text-xs text-gray-400">{p.phone || 'No phone'}</span>
                                                            </div>
                                                            {mode !== 'none' ? (
                                                                <span className="text-blue-600 text-sm font-bold bg-blue-50 px-2 py-1 rounded">
                                                                    {mode === 'score' ? 'Score' : 'Board'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-green-600 text-sm font-bold bg-green-50 px-2 py-1 rounded">+ Add</span>
                                                            )}
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="bg-green-600 text-white font-black px-6 rounded-xl text-[14pt] shrink-0 hover:bg-green-700 transition-all shadow-md active:scale-95 h-[48px] flex items-center justify-center"
                                >
                                    + Guest
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-1 space-y-6 bg-gray-50 pb-[100px]">
                            {isCreating ? (
                                <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                                            <input
                                                type="text"
                                                value={newPlayer.firstName}
                                                onChange={e => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                                                className="w-full text-lg p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-black"
                                                placeholder="First"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                                            <input
                                                type="text"
                                                value={newPlayer.lastName}
                                                onChange={e => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                                                className="w-full text-lg p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-black"
                                                placeholder="Last"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                                            <input
                                                type="tel"
                                                value={newPlayer.phone}
                                                onChange={e => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                                                className="w-full text-lg p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-black"
                                                placeholder="504-555-1234"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Handicap Index</label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={newPlayer.handicapIndex}
                                                onChange={e => setNewPlayer({ ...newPlayer, handicapIndex: e.target.value })}
                                                className="w-full text-lg p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-black"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                                        <input
                                            type="email"
                                            value={newPlayer.email}
                                            onChange={e => setNewPlayer({ ...newPlayer, email: e.target.value })}
                                            className="w-full text-lg p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-black"
                                            placeholder="player@example.com"
                                        />
                                    </div>
                                    {newPlayerError && (
                                        <div className="p-3 bg-red-100 text-red-700 rounded-lg font-medium text-sm">{newPlayerError}</div>
                                    )}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                setIsCreating(false);
                                                setNewPlayerError('');
                                            }}
                                            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg text-xl"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleCreatePlayer}
                                            disabled={isSubmitting}
                                            className="flex-1 bg-black text-white font-bold py-3 rounded-lg text-xl disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Creating..." : "Create Player"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Section 1: Your Group */}
                                    <div className="space-y-3">
                                        {groupPlayers.length > 0 ? (
                                            <>
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Your Group</h3>
                                                    <span className="text-[10pt] font-bold text-zinc-400">{groupPlayers.length} Players</span>
                                                </div>
                                                {groupPlayers.map(player => {
                                                    const mode = getPlayerMode(player.id);
                                                    const selection = useDualCheckbox ? getPlayerSelection(player.id) : null;
                                                    const isSelected = useDualCheckbox ? (selection?.score || selection?.leaderboard) : (mode !== 'none');

                                                    const isInRound = playersInRound.includes(player.id);
                                                    const wasInMyGroup = useDualCheckbox
                                                        ? !!playerSelections?.[player.id]
                                                        : (playerModes[player.id] === 'score' || playerModes[player.id] === 'leaderboard');

                                                    const isDisabled = !isAdmin && isInRound && hasMultipleGroups && !wasInMyGroup;

                                                    return (
                                                        <div
                                                            key={player.id}
                                                            className={`p-1 rounded-2xl border-2 transition-all shadow-sm ${isDisabled
                                                                ? 'border-zinc-200 bg-zinc-100/50 opacity-60'
                                                                : isSelected
                                                                    ? 'border-blue-500 bg-white'
                                                                    : 'border-white bg-white/50 grayscale'
                                                                }`}
                                                        >
                                                            {/* Player Name Row */}
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[19pt] font-black italic uppercase tracking-tighter ${isDisabled ? 'text-zinc-400' : isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                                                                        {player.name}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        {isInRound && (
                                                                            <span className={`px-2 py-0.5 rounded-lg text-[10pt] font-black uppercase tracking-widest ${isDisabled ? 'bg-zinc-200 text-zinc-400' : 'bg-green-100 text-green-700'}`}>
                                                                                {isDisabled ? 'Claimed' : 'Locked'}
                                                                            </span>
                                                                        )}
                                                                        {/* Course Handicap */}
                                                                        {(() => {
                                                                            const courseHcp = getCourseHandicap(player);
                                                                            return courseHcp !== null && (
                                                                                <span className={`text-[14pt] font-bold ${isDisabled ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                                    ({courseHcp})
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-2">
                                                                {useDualCheckbox ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => !isDisabled && toggleScore(player.id)}
                                                                            disabled={isDisabled}
                                                                            className={`flex-1 h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${selection?.score
                                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                                                : isDisabled
                                                                                    ? 'bg-zinc-100 text-zinc-400'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                                }`}
                                                                        >
                                                                            Score
                                                                        </button>
                                                                        <button
                                                                            onClick={() => !isDisabled && toggleLeaderboard(player.id)}
                                                                            disabled={isDisabled}
                                                                            className={`flex-1 h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${selection?.leaderboard
                                                                                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200'
                                                                                : isDisabled
                                                                                    ? 'bg-zinc-100 text-zinc-400'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                                }`}
                                                                        >
                                                                            Board
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (isDisabled) return;
                                                                                setConfirmDeleteId(player.id);
                                                                            }}
                                                                            disabled={isDisabled}
                                                                            className={`flex-1 h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${isDisabled
                                                                                ? 'bg-zinc-100 text-zinc-400'
                                                                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                                }`}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => !isDisabled && setPlayerMode(player.id, 'score')}
                                                                            disabled={isDisabled}
                                                                            className={`flex-1 h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${mode === 'score'
                                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                                                : isDisabled
                                                                                    ? 'bg-zinc-100 text-zinc-400'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                                }`}
                                                                        >
                                                                            Score
                                                                        </button>
                                                                        <button
                                                                            onClick={() => !isDisabled && setPlayerMode(player.id, 'leaderboard')}
                                                                            disabled={isDisabled}
                                                                            className={`flex-1 h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${mode === 'leaderboard'
                                                                                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200'
                                                                                : isDisabled
                                                                                    ? 'bg-zinc-100 text-zinc-400'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                                }`}
                                                                        >
                                                                            Board
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (isDisabled) return;
                                                                                setConfirmDeleteId(player.id);
                                                                            }}
                                                                            disabled={isDisabled}
                                                                            className={`flex-1 h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${mode === 'none'
                                                                                ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                                                                : isDisabled
                                                                                    ? 'bg-zinc-100 text-zinc-400'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                                }`}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-3 border-2 border-dashed border-zinc-200 rounded-3xl">
                                                <div className="text-4xl">🏌️‍♂️</div>
                                                <div className="font-black uppercase tracking-widest text-xs">Search to add players</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 2: Quick Suggestions */}
                                    {suggestions.length > 0 && (
                                        <div className="space-y-3 pb-8">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Frequent Buddies</h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {suggestions.map(player => (
                                                    <button
                                                        key={'suggest-' + player.id}
                                                        onClick={() => toggleScore(player.id)}
                                                        className="flex items-center justify-between p-1 bg-white rounded-2xl border border-zinc-100 shadow-sm active:scale-[0.98] transition-all hover:border-zinc-300"
                                                    >
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-[14pt] font-black uppercase italic tracking-tighter text-zinc-900">{player.name}</span>
                                                            <span className="text-[10pt] font-bold text-zinc-400">{player.phone ? player.phone.slice(-4) : 'No phone'}</span>
                                                        </div>
                                                        <span className="bg-zinc-100 text-zinc-900 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest">+ Add</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {!isCreating && (
                            <div className="p-4 bg-transparent border-t border-gray-100 flex justify-between gap-3 z-10 sticky bottom-0 backdrop-blur-sm">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-white text-black border-2 border-black rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all text-white ${hasChanges ? 'bg-blue-600' : 'bg-black'
                                        }`}
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Confirmation Modal */}
            {confirmDeleteId && (
                <ConfirmModal
                    isOpen={!!confirmDeleteId}
                    title="Remove Player?"
                    message={`Are you sure you want to remove ${localAllPlayers.find(p => p.id === confirmDeleteId)?.name} from this round?`}
                    confirmText="Remove"
                    cancelText="Cancel"
                    onConfirm={() => {
                        if (confirmDeleteId) {
                            if (useDualCheckbox) {
                                removePlayer(confirmDeleteId);
                            } else {
                                setPlayerMode(confirmDeleteId, 'none');
                            }
                            setConfirmDeleteId(null);
                        }
                    }}
                    onCancel={() => setConfirmDeleteId(null)}
                    isDestructive
                />
            )}
        </div>
    );
}
