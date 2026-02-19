import { useState, useEffect } from 'react';
import { X, Mail, Save, Check } from 'lucide-react';
import PoolResults from './PoolResults';
import { getPoolResults } from '../actions/get-pool-results';
import { saveRoundWinnings } from '../actions/save-round-payouts';
// import { PoolManagementButton } from './PoolManagementButton'; // Deprecated
import { PoolCopyButton } from './PoolCopyButton';
import { PoolDateSelector } from './PoolDateSelector';
import { toggleLivePoolParticipation } from '../actions/create-live-round';
import ConfirmModal from './ConfirmModal';
import Cookies from 'js-cookie';

interface PoolModalProps {
    roundId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PoolModal({ roundId: initialRoundId, isOpen, onClose }: PoolModalProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentRoundId, setCurrentRoundId] = useState(initialRoundId || 'latest');
    const [isSaving, setIsSaving] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
        hideCancel?: boolean;
        confirmText?: string;
    } | null>(null);

    useEffect(() => {
        const checkAdmin = () => {
            const adminCookie = Cookies.get('admin_session');
            setIsAdmin(adminCookie === 'true');
        };
        checkAdmin();
        window.addEventListener('admin-change', checkAdmin);
        return () => window.removeEventListener('admin-change', checkAdmin);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setError(null);
            fetchData(currentRoundId || 'latest');
        }
    }, [isOpen, currentRoundId]);

    // Update internal state if prop changes while closed or initially
    useEffect(() => {
        if (!isOpen) {
            setCurrentRoundId(initialRoundId || 'latest');
        }
    }, [initialRoundId, isOpen]);

    const fetchData = async (id: string) => {
        console.log(`PoolModal: Fetching data for round ${id}`);
        setIsLoading(true);
        setError(null);
        try {
            const result = await getPoolResults(id);
            if (result.success && result.data) {
                console.log(`PoolModal: Success! Participants count: ${result.data.allPoolParticipants.length}`);
                setData(result.data);

                // If we fetched the 'latest', update the currentRoundId to the actual ID found
                if (id === 'latest' || !id) {
                    setCurrentRoundId(result.data.round.id);
                }

                setIsLoading(false);
            } else {
                console.error(`PoolModal: Error! ${result.error}`);
                setError(result.error || 'Failed to load pool data');
                setIsLoading(false);
            }
        } catch (err) {
            console.error('PoolModal: fetchData threw an exception:', err);
            setError('Failed to load pool data. Please try again.');
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        if (!data?.round) return;

        // Prepare payouts
        const payouts = Object.entries(data.winningsMap || {}).map(([name, amount]) => {
            const p = data.round.players.find((rp: any) => rp.player.name === name);
            return { playerId: p?.player_id || '', amount: amount as number };
        });

        setConfirmConfig({
            isOpen: true,
            title: 'Save Winnings',
            message: 'This will save these calculated winnings to the database. Continue?',
            isDestructive: false,
            onConfirm: async () => {
                setConfirmConfig(null);
                setIsSaving(true);
                try {
                    await saveRoundWinnings(data.round.id, payouts);
                    setConfirmConfig({
                        isOpen: true,
                        title: 'Success',
                        message: 'Winnings saved successfully!',
                        hideCancel: true,
                        confirmText: 'OK',
                        onConfirm: () => setConfirmConfig(null)
                    });
                } catch (err) {
                    console.error(err);
                    setConfirmConfig({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to save winnings.',
                        isDestructive: true,
                        hideCancel: true,
                        confirmText: 'OK',
                        onConfirm: () => setConfirmConfig(null)
                    });
                } finally {
                    setIsSaving(false);
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between shadow-sm sticky top-0 z-10 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-[18pt] font-black text-green-600 leading-tight text-left">FBT Game</h2>
                    {data?.round && (
                        <p className="text-[12pt] text-gray-500 font-medium">
                            {new Date(data.round.date.split('T')[0] + 'T12:00:00').toLocaleDateString()} {data.round.name ? `- ${data.round.name}` : ''}
                        </p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    title="Close"
                    className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
                >
                    <X className="w-8 h-8" />
                </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                        <p className="text-[14pt] font-bold text-gray-500 animate-pulse">Calculating Pots & Skins...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                        <div className="bg-red-50 text-red-500 p-6 rounded-full">
                            <X className="w-12 h-12" />
                        </div>
                        <h3 className="text-[16pt] font-bold text-gray-900">Oops! Something went wrong</h3>
                        <p className="text-[14pt] text-gray-500 max-w-md">{error}</p>
                        <button
                            onClick={() => fetchData(currentRoundId)}
                            className="bg-black text-white p-1 rounded-full font-bold text-[14pt] hover:bg-gray-800 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <main className="w-full">
                        {/* Admin Action Bar (Replicating Page Style) */}
                        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-1 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
                            <PoolDateSelector
                                allRounds={data.allRounds}
                                currentRoundId={currentRoundId}
                                onSelect={(id) => setCurrentRoundId(id)}
                            />
                            {isAdmin && (
                                <div className="flex gap-2 shrink-0 ml-4">
                                    <PoolCopyButton
                                        date={data.round.date}
                                        roundName={data.round.name}
                                        isTournament={data.round.is_tournament}
                                        flights={data.processedFlights}
                                    />
                                    <button
                                        title="Email Winners"
                                        className="p-1 bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm text-white cursor-pointer"
                                    >
                                        <Mail className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        title="Save Winnings"
                                        className="p-1 bg-[#04d361] rounded-full hover:bg-[#04b754] transition-colors shadow-sm text-white cursor-pointer disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : (
                                            <Save className="w-6 h-6" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-white min-h-[calc(100vh-250px)]">
                            {/* Participants Selection (Inline) */}
                            <div className="bg-[#f8fafc] border-b border-gray-100 px-6 py-6 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-[16pt] font-black text-gray-800 tracking-tight">Players ({data.allPoolParticipants.length})</h2>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {data.round.players
                                        .sort((a: any, b: any) => (a.player?.name || a.guestName || '').localeCompare(b.player?.name || b.guestName || ''))
                                        .map((p: any) => {
                                            const playerId = p.playerId || p.id; // Use logic consistent with toggle action
                                            const isSelected = data.allPoolParticipants.some((participant: any) => (participant.playerId === playerId || participant.id === playerId));
                                            const name = p.player?.name || p.guestName || 'Guest';

                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={async () => {
                                                        // Optimistic Update? Or just fetch? fetching is safer for now
                                                        await toggleLivePoolParticipation({ liveRoundId: data.round.id, playerId: playerId });
                                                        fetchData(currentRoundId);
                                                    }}
                                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] select-none ${isSelected ? 'bg-white border-green-500 shadow-sm ring-1 ring-green-500' : 'bg-gray-50 border-transparent opacity-70 hover:opacity-100'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${isSelected ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'}`}>
                                                            {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                                        </div>
                                                        <span className={`text-[15pt] font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{name}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            <PoolResults
                                allPoolParticipants={data.allPoolParticipants}
                                poolActivePlayers={data.poolActivePlayers}
                                round={data.round}
                                flights={data.flights}
                                processedFlights={data.processedFlights}
                                winningsMap={data.winningsMap}
                                onClose={onClose}
                            />
                        </div>
                    </main>
                )}
            </div>

            {/* Fixed Footer with Full-Width Close Button */}
            {!isLoading && !error && data && (
                <div className="bg-white border-t border-gray-100 flex w-full sticky bottom-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-black text-white py-3 rounded-full text-[15pt] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            )}

            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDestructive={confirmConfig.isDestructive}
                    hideCancel={confirmConfig.hideCancel}
                    confirmText={confirmConfig.confirmText}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}
