'use client';

import { useState, useEffect } from 'react';
import { createPlayer } from '@/app/actions';

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
    hasMultipleGroups = false,
    roundShortId
}: {
    allPlayers: Player[];
    selectedIds: string[];
    playersInRound?: string[];
    onSelectionChange: (ids: string[]) => void;
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
    roundShortId?: string;
}) {
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
    const [searchQuery, setSearchQuery] = useState('');
    const [localAllPlayers, setLocalAllPlayers] = useState<Player[]>(allPlayers);
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
            setLocalAllPlayers(allPlayers); // Update list if props change
            setIsCreating(false);
            setNewPlayerError('');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, allPlayers, selectedIds]);

    if (!isOpen) return null;

    const togglePlayer = (id: string) => {
        setLocalSelectedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onSelectionChange(localSelectedIds);
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
            // Automatically select the new player
            setLocalSelectedIds(prev => [...prev, created.id]);

            setIsCreating(false);
            setSearchQuery(''); // Clear search to show context or just done
            setNewPlayer({ firstName: '', lastName: '', email: '', phone: '', handicapIndex: '0' });
        } catch (err: any) {
            setNewPlayerError(err.message || "Failed to create player.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter Logic
    const filteredPlayers = localAllPlayers.filter(p => {
        if (!searchQuery) return true;

        const q = searchQuery.toLowerCase();
        const last4 = p.phone ? p.phone.slice(-4) : '';
        const playerId = p.player_id ? p.player_id.toLowerCase() : '';
        return p.name.toLowerCase().includes(q) || last4.includes(q) || playerId.includes(q);
    });

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        // Priority 1: Current User
        if (currentUserId && a.id === currentUserId) return -1;
        if (currentUserId && b.id === currentUserId) return 1;

        // Priority 2: In Group (Frequent or already selected)
        const isAFrequent = frequentPlayerIds?.includes(a.id);
        const isBFrequent = frequentPlayerIds?.includes(b.id);
        if (isAFrequent && !isBFrequent) return -1;
        if (!isAFrequent && isBFrequent) return 1;

        // Priority 3: Alphabetical by Last Name
        const aLastName = a.name.split(' ').pop() || a.name;
        const bLastName = b.name.split(' ').pop() || b.name;
        return aLastName.localeCompare(bLastName);
    });

    // Determine course handicap
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
        <div className="fixed inset-0 z-[200] bg-white flex flex-col w-full h-full overflow-hidden">
            <div className="flex-1 flex flex-col h-full animate-in fade-in duration-200">

                {/* Header */}
                <div className="px-3 py-2 bg-white flex flex-col gap-1 shadow-sm z-10">
                    <div className="flex justify-between items-center">
                        <h2 className="text-[16pt] font-bold text-left ml-1">
                            {isCreating ? "Create New Player" : "Search player:"}
                        </h2>
                        {/* Close button removed as requested */}
                    </div>


                    {!isCreating && (
                        <div className="relative flex items-stretch gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Search by First/Last Name"
                                    title="Search players"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full text-[14pt] h-[48px] p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-black bg-white shadow-sm transition-all"
                                />
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="bg-green-600 text-white font-black px-6 rounded-xl text-[14pt] shrink-0 hover:bg-green-700 transition-all shadow-md active:scale-95 h-[48px] flex items-center justify-center"
                                >
                                    + Guest
                                </button>
                            </div>
                    )}
                        </div>

                {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        {isCreating ? (
                            <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            title="First Name"
                                            className="w-full border-2 border-gray-300 p-3 rounded-lg text-lg text-black bg-white"
                                            value={newPlayer.firstName}
                                            onChange={e => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            title="Last Name"
                                            className="w-full border-2 border-gray-300 p-3 rounded-lg text-lg text-black bg-white"
                                            value={newPlayer.lastName}
                                            onChange={e => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email (Optional)</label>
                                    <input
                                        type="email"
                                        title="Email Address"
                                        className="w-full border-2 border-gray-300 p-3 rounded-lg text-lg text-black bg-white"
                                        value={newPlayer.email}
                                        onChange={e => setNewPlayer({ ...newPlayer, email: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Mobile Phone (Optional)</label>
                                    <input
                                        type="tel"
                                        title="Mobile Phone"
                                        className="w-full border-2 border-gray-300 p-3 rounded-lg text-lg text-black bg-white"
                                        value={newPlayer.phone}
                                        onChange={e => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Handicap Index (Optional)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        title="Handicap Index"
                                        className="w-full border-2 border-gray-300 p-3 rounded-lg text-lg text-black bg-white"
                                        value={newPlayer.handicapIndex}
                                        onChange={e => setNewPlayer({ ...newPlayer, handicapIndex: e.target.value })}
                                        placeholder="0.0"
                                    />
                                </div>

                                {newPlayerError && (
                                    <div className="text-red-600 font-bold bg-red-50 p-3 rounded-lg text-center">
                                        {newPlayerError}
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => { setIsCreating(false); setNewPlayerError(''); }}
                                        className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg text-xl"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Empty State / No Results */}
                                {sortedPlayers.length === 0 && (
                                    <div className="col-span-full text-center py-10 text-gray-500">
                                        <div className="text-[20pt] mb-2">No players found</div>
                                        <div>Try a different search or create a new player.</div>
                                        <button
                                            onClick={() => setIsCreating(true)}
                                            className="mt-6 bg-green-600 text-white font-bold px-6 py-3 rounded-full text-lg shadow-md"
                                        >
                                            Create New Player
                                        </button>
                                    </div>
                                )}

                                {sortedPlayers.map(player => {
                                    const isSelected = localSelectedIds.includes(player.id);
                                    const isInRound = playersInRound.includes(player.id);
                                    const wasInMyGroup = selectedIds.includes(player.id);
                                    const isDisabled = !isAdmin && isInRound && hasMultipleGroups && !wasInMyGroup;

                                    return (
                                        <button
                                            key={player.id}
                                            onClick={() => togglePlayer(player.id)}
                                            disabled={isDisabled}
                                            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isDisabled
                                                ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                                : isSelected
                                                    ? 'border-blue-500 bg-blue-50 shadow-sm cursor-pointer'
                                                    : 'border-gray-100 bg-white hover:border-gray-200 cursor-pointer'
                                                }`}
                                        >
                                            <div className={`w-7 h-7 shrink-0 rounded flex items-center justify-center border-2 transition-colors ${isDisabled
                                                ? 'bg-gray-200 border-gray-300'
                                                : isSelected
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'bg-white border-gray-300'
                                                }`}>
                                                {isSelected && (
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[18pt] font-bold ${isDisabled ? 'text-gray-400' : isSelected ? 'text-blue-800' : 'text-gray-700'
                                                        }`}>
                                                        {player.name}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {isInRound && (
                                                            <span className={`px-2 py-0.5 rounded text-[10pt] font-black uppercase tracking-wider ${isDisabled ? 'bg-gray-200 text-gray-400' : 'bg-green-100 text-green-700'}`}>
                                                                {isDisabled ? 'Claimed' : (roundShortId || 'In Group')}
                                                            </span>
                                                        )}
                                                        {/* Course Handicap */}
                                                        {(() => {
                                                            const courseHcp = getCourseHandicap(player);
                                                            return courseHcp !== null && (
                                                                <span className={`text-[14pt] font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    ({courseHcp})
                                                                </span>
                                                            );
                                                        })()}
                                                        {/* Tee Box Indicator */}
                                                        {player.preferred_tee_box && (
                                                            <span className={`px-2 py-0.5 rounded text-[12pt] font-bold ${isDisabled
                                                                ? 'bg-gray-200 text-gray-400'
                                                                : player.preferred_tee_box.toLowerCase().includes('white')
                                                                    ? 'bg-white text-black border border-black'
                                                                    : player.preferred_tee_box.toLowerCase().includes('gold')
                                                                        ? 'bg-yellow-400 text-black'
                                                                        : 'bg-gray-300 text-gray-700'
                                                                }`}>
                                                                {player.preferred_tee_box.toLowerCase().includes('white')
                                                                    ? 'W'
                                                                    : player.preferred_tee_box.toLowerCase().includes('gold')
                                                                        ? 'G'
                                                                        : player.preferred_tee_box.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isDisabled && (
                                                    <div className="text-[11pt] text-gray-500 italic mt-0.5">Scored by another device.</div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {!isCreating && (
                        <div className="p-4 bg-white border-t border-gray-100 flex justify-between gap-3 z-10 sticky bottom-0">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-white text-black border-2 border-black rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all text-white ${(() => {
                                    const nextIds = [...localSelectedIds].sort().join(',');
                                    const prevIds = [...selectedIds].sort().join(',');
                                    return nextIds !== prevIds ? 'bg-blue-600' : 'bg-black';
                                })()}`}
                            >
                                Save ({localSelectedIds.length})
                            </button>
                        </div>
                    )}
                </div>
            </div>
            );
}
