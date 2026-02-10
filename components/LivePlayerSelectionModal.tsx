'use client';

import { useState, useEffect, useRef } from 'react';
import { createPlayer } from '@/app/actions';
import { getAllPlayers } from '@/app/actions/get-all-players';

interface Player {
    id: string;
    name: string;
    index?: number;
    preferred_tee_box?: string | null;
    phone?: string | null;
    player_id?: string | null;
    scorerId?: string | null;
}

interface TeeBox {
    id: string;
    name: string;
    rating: number;
    slope: number;
}

export function LivePlayerSelectionModal({
    allPlayers,
    selectedIds,
    playersInRound = [],
    onSelectionChange,
    isOpen,
    onClose,
    courseData,
    isAdmin = false,
    frequentPlayerIds = [],
    currentUserId,
    hasMultipleGroups = false
}: {
    allPlayers: Player[];
    selectedIds: string[];
    playersInRound?: string[];
    onSelectionChange: (scoring: Player[], inRound: Player[]) => void;
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
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
    const [localInRoundIds, setLocalInRoundIds] = useState<string[]>(playersInRound);
    const [searchQuery, setSearchQuery] = useState('');
    const [localAllPlayers, setLocalAllPlayers] = useState<Player[]>(allPlayers);
    const searchRef = useRef<HTMLDivElement>(null);

    // Create Player Mode
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPlayerError, setNewPlayerError] = useState('');
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
            setLocalSelectedIds(selectedIds);
            setLocalInRoundIds(playersInRound || []);

            const fetchAllPlayers = async () => {
                const systemPlayers = await getAllPlayers();
                // Merge in round-specific data (like scorerId) from the allPlayers prop
                const merged = systemPlayers.map(p => {
                    const roundPlayer = allPlayers.find(rp => rp.id === p.id);
                    return roundPlayer ? { ...p, scorerId: roundPlayer.scorerId } : p;
                });
                setLocalAllPlayers(merged);
            };
            fetchAllPlayers();

            setIsCreating(false);
            setNewPlayerError('');
        }
    }, [isOpen, selectedIds, playersInRound]);

    // Close search dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const toggleScoring = (id: string) => {
        setLocalSelectedIds(prev => {
            const isNowSelected = !prev.includes(id);
            if (isNowSelected) {
                if (!localInRoundIds.includes(id)) {
                    setLocalInRoundIds(curr => [...curr, id]);
                }
                return [...prev, id];
            } else {
                return prev.filter(p => p !== id);
            }
        });
    };

    const toggleInRound = (id: string) => {
        setLocalInRoundIds(prev => {
            const isNowInRound = !prev.includes(id);
            if (!isNowInRound) {
                setLocalSelectedIds(curr => curr.filter(cid => cid !== id));
                return prev.filter(p => p !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleConfirm = () => {
        const scoringPlayersList = localAllPlayers.filter(p => localSelectedIds.includes(p.id));
        const inRoundPlayersList = localAllPlayers.filter(p => localInRoundIds.includes(p.id));
        onSelectionChange(scoringPlayersList, inRoundPlayersList);
        onClose();
    };

    const handleCreatePlayer = async () => {
        setNewPlayerError('');
        if (!newPlayer.firstName || !newPlayer.lastName || !newPlayer.email || !newPlayer.phone) {
            setNewPlayerError('All fields (Name, Email, Phone) are required.');
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

            const newPlayerObj: Player = {
                id: created.id,
                name: created.name,
                index: created.handicapIndex,
                preferred_tee_box: created.preferredTeeBox,
                phone: created.phone
            };

            setLocalAllPlayers(prev => [...prev, newPlayerObj]);
            setLocalInRoundIds(prev => [...prev, created.id]);
            setLocalSelectedIds(prev => [...prev, created.id]);
            setIsCreating(false);
            setSearchQuery('');
            setNewPlayer({ firstName: '', lastName: '', email: '', phone: '', handicapIndex: '0' });
        } catch (err: any) {
            setNewPlayerError(err.message || "Failed to create player.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredPlayers = localAllPlayers.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const last4 = p.phone ? p.phone.slice(-4) : '';
        const pid = p.player_id ? p.player_id.toLowerCase() : '';
        return p.name.toLowerCase().includes(q) || last4.includes(q) || pid.includes(q);
    });

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        // Priority 1: Current User (YOU)
        const isAUser = currentUserId === a.id;
        const isBUser = currentUserId === b.id;
        if (isAUser && !isBUser) return -1;
        if (!isAUser && isBUser) return 1;

        // Priority 2: Anyone who has a score keeper
        // (Either locally selected by me, OR already has a scorerId on the server)
        const hasAScorer = (p: Player) => localSelectedIds.includes(p.id) || !!p.scorerId;
        const isAHoved = hasAScorer(a);
        const isBHoved = hasAScorer(b);
        if (isAHoved && !isBHoved) return -1;
        if (!isAHoved && isBHoved) return 1;

        // Tie-breaker: Alphabetical by Last Name
        const aLastName = a.name.split(' ').pop() || a.name;
        const bLastName = b.name.split(' ').pop() || b.name;
        return aLastName.localeCompare(bLastName);
    });

    const getCourseHandicap = (player: Player): number | null => {
        if (player.index === undefined || !courseData) return null;
        const isCityParkNorth = courseData.courseName.toLowerCase().includes('city park north');
        let teeBox: TeeBox | undefined;
        if (isCityParkNorth && player.preferred_tee_box) {
            teeBox = courseData.teeBoxes.find(t =>
                player.preferred_tee_box && t.name.toLowerCase().includes(player.preferred_tee_box.toLowerCase())
            );
        }
        if (!teeBox && courseData.roundTeeBox) {
            teeBox = courseData.teeBoxes.find(t =>
                t.rating === courseData.roundTeeBox!.rating && t.slope === courseData.roundTeeBox!.slope
            );
        }
        if (!teeBox) {
            teeBox = courseData.teeBoxes.find(t => t.name.toLowerCase().includes('white')) || courseData.teeBoxes[0];
        }
        if (!teeBox) return null;
        const courseHandicap = (player.index * teeBox.slope / 113) + (teeBox.rating - courseData.par);
        return Math.round(courseHandicap);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white p-1">
            <div className="bg-white w-full h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-2 border-b border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-[18pt] font-black uppercase italic tracking-tighter">
                            {isCreating ? "+ New Guest" : "Select player:"}
                        </h2>
                        <button onClick={onClose} className="p-2 bg-black text-white rounded-full shadow-lg" aria-label="Close modal">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {!isCreating && (
                        <div className="flex gap-2">
                            <div className="flex-1 relative" ref={searchRef}>
                                <label htmlFor="player-search" className="sr-only">Search players</label>
                                <input
                                    id="player-search"
                                    type="text"
                                    placeholder="Search player name"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full text-[14pt] h-[48px] px-4 border-2 border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                />
                                {searchQuery && filteredPlayers.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black rounded-xl shadow-2xl max-h-[400px] overflow-y-auto z-[100] p-1">
                                        <div className="p-2 text-[10pt] font-black uppercase text-zinc-400 tracking-widest border-b border-gray-100">Search Results</div>
                                        {sortedPlayers.slice(0, 20).map(player => {
                                            const isSelected = localSelectedIds.includes(player.id);
                                            const isInRound = localInRoundIds.includes(player.id);
                                            const isInRoundOnServer = playersInRound.includes(player.id);
                                            const wasInMyGroup = selectedIds.includes(player.id);
                                            const isDisabled = !isAdmin && isInRoundOnServer && hasMultipleGroups && !wasInMyGroup;

                                            return (
                                                <div key={player.id} className="flex items-center justify-between p-3 border-b border-gray-50 bg-white">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[15pt] font-black italic uppercase tracking-tighter ${isDisabled ? 'text-gray-400' : 'text-zinc-900'}`}>{player.name}</span>
                                                        <span className="text-[10pt] text-gray-500 font-bold uppercase tracking-widest line-clamp-1">{player.player_id || 'Player'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {/* Keep Score Checkbox - Show for YOU, if you are ALREADY keeping score, if they have NO score keeper, or if Admin */}
                                                        {(player.id === currentUserId || isSelected || !player.scorerId || isAdmin) && (
                                                            <label className={`flex items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    disabled={isDisabled}
                                                                    onChange={() => toggleScoring(player.id)}
                                                                    className="w-5 h-5 rounded border-2 border-black accent-black cursor-pointer"
                                                                />
                                                                <span className="text-[11pt] font-black uppercase italic tracking-tighter text-zinc-900">Keep Score</span>
                                                            </label>
                                                        )}

                                                        {/* Leaderboard Checkbox */}
                                                        <label className={`flex items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isInRound}
                                                                disabled={isDisabled}
                                                                onChange={() => toggleInRound(player.id)}
                                                                className="w-5 h-5 rounded border-2 border-black accent-black cursor-pointer"
                                                            />
                                                            <span className="text-[11pt] font-black uppercase italic tracking-tighter text-zinc-900">Leaderboard</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setIsCreating(true)} className="px-6 h-[48px] bg-green-600 text-white font-black rounded-xl uppercase italic tracking-tighter shadow-md active:scale-95">Guest</button>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
                    {isCreating ? (
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 max-w-md mx-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="new-player-first-name" className="sr-only">First Name</label>
                                    <input id="new-player-first-name" placeholder="First Name" className="w-full p-3 border-2 border-gray-200 rounded-lg text-xl" value={newPlayer.firstName} onChange={e => setNewPlayer({ ...newPlayer, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <label htmlFor="new-player-last-name" className="sr-only">Last Name</label>
                                    <input id="new-player-last-name" placeholder="Last Name" className="w-full p-3 border-2 border-gray-200 rounded-lg text-xl" value={newPlayer.lastName} onChange={e => setNewPlayer({ ...newPlayer, lastName: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="new-player-email" className="sr-only">Email</label>
                                <input id="new-player-email" type="email" placeholder="Email" className="w-full p-3 border-2 border-gray-200 rounded-lg text-xl" value={newPlayer.email} onChange={e => setNewPlayer({ ...newPlayer, email: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="new-player-phone" className="sr-only">Phone</label>
                                <input id="new-player-phone" type="tel" placeholder="Phone" className="w-full p-3 border-2 border-gray-200 rounded-lg text-xl" value={newPlayer.phone} onChange={e => setNewPlayer({ ...newPlayer, phone: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="new-player-handicap" className="text-sm font-bold uppercase text-gray-500 ml-1">Handicap Index</label>
                                <input id="new-player-handicap" type="number" step="0.1" placeholder="0.0" className="w-full p-3 border-2 border-gray-200 rounded-lg text-xl" value={newPlayer.handicapIndex} onChange={e => setNewPlayer({ ...newPlayer, handicapIndex: e.target.value })} />
                            </div>
                            {newPlayerError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-center font-bold">{newPlayerError}</div>}
                            <div className="flex gap-2">
                                <button onClick={() => setIsCreating(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg uppercase">Cancel</button>
                                <button onClick={handleCreatePlayer} disabled={isSubmitting} className="flex-1 py-3 bg-black text-white font-bold rounded-lg uppercase disabled:opacity-50">{isSubmitting ? "Creating..." : "Add"}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {localAllPlayers.filter(p => localInRoundIds.includes(p.id)).length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-400 font-bold text-xl uppercase italic tracking-tighter">No players in round</p>
                                    <p className="text-gray-400 text-sm mt-1">Search for players above to add them to your leaderboard or scoring group.</p>
                                </div>
                            )}

                            {[...localAllPlayers.filter(p => localInRoundIds.includes(p.id))].sort((a, b) => {
                                // Priority 1: Current User (YOU)
                                const isAUser = currentUserId === a.id;
                                const isBUser = currentUserId === b.id;
                                if (isAUser && !isBUser) return -1;
                                if (!isAUser && isBUser) return 1;

                                // Priority 2: Has a score keeper
                                const hasAScorer = (p: Player) => localSelectedIds.includes(p.id) || !!p.scorerId;
                                const isAHoved = hasAScorer(a);
                                const isBHoved = hasAScorer(b);
                                if (isAHoved && !isBHoved) return -1;
                                if (!isAHoved && isBHoved) return 1;

                                return a.name.localeCompare(b.name);
                            }).map(player => {
                                const isSelected = localSelectedIds.includes(player.id);
                                const isInRoundOnServer = playersInRound.includes(player.id);
                                const wasInMyGroup = selectedIds.includes(player.id);
                                const isDisabled = !isAdmin && isInRoundOnServer && hasMultipleGroups && !wasInMyGroup;

                                return (
                                    <div key={player.id} className={`p-4 rounded-xl border-2 transition-all shadow-sm ${isDisabled ? 'bg-gray-100 border-gray-200' : isSelected ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[18pt] font-black italic uppercase tracking-tighter ${isDisabled ? 'text-gray-400' : isSelected ? 'text-green-800' : 'text-blue-800'}`}>{player.name}</span>
                                                {!isSelected && localInRoundIds.includes(player.id) && !player.scorerId && (
                                                    <span className="text-[12px] font-black text-red-600 uppercase">
                                                        No Score Keeper
                                                    </span>
                                                )}
                                                {(() => {
                                                    const hcp = getCourseHandicap(player);
                                                    return hcp !== null && <span className="text-[14pt] font-bold text-gray-500">({hcp})</span>;
                                                })()}
                                            </div>
                                            {player.id === currentUserId && <span className="bg-blue-600 text-white text-[8pt] font-black px-1.5 py-0.5 rounded uppercase italic">YOU</span>}
                                        </div>
                                        <div className="flex items-center gap-6 mt-1">
                                            {/* Keep Score Checkbox - Show for YOU, if you are ALREADY keeping score, if they have NO score keeper, or if Admin */}
                                            {(player.id === currentUserId || isSelected || !player.scorerId || isAdmin) && (
                                                <label className={`flex items-center gap-2.5 cursor-pointer ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={() => toggleScoring(player.id)}
                                                        className="w-6 h-6 rounded-md border-2 border-black accent-black cursor-pointer shadow-sm"
                                                    />
                                                    <span className={`text-[13pt] font-black uppercase italic tracking-tighter ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`}>Keep Score</span>
                                                </label>
                                            )}

                                            {/* Leaderboard Checkbox */}
                                            <label className={`flex items-center gap-2.5 cursor-pointer ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={localInRoundIds.includes(player.id)}
                                                    disabled={isDisabled}
                                                    onChange={() => toggleInRound(player.id)}
                                                    className="w-6 h-6 rounded-md border-2 border-black accent-black cursor-pointer shadow-sm"
                                                />
                                                <span className={`text-[13pt] font-black uppercase italic tracking-tighter ${localInRoundIds.includes(player.id) ? 'text-zinc-900' : 'text-zinc-400'}`}>Leaderboard</span>
                                            </label>
                                        </div>
                                        {isDisabled && <div className="mt-2 text-[10pt] font-black uppercase italic tracking-tighter text-gray-400">Scored by another device</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isCreating && (
                    <div className="p-2 border-t border-gray-100">
                        <button
                            onClick={handleConfirm}
                            className="w-full py-4 bg-black text-white text-[18pt] font-black uppercase italic tracking-tighter rounded-xl shadow-lg active:scale-[0.98] transition-all"
                        >
                            Save Round Configuration
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
