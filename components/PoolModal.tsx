import { useState, useEffect } from 'react';
import { X, Mail } from 'lucide-react';
import PoolResults from './PoolResults';
import { getPoolResults } from '@/app/actions/get-pool-results';
import { PoolManagementButton } from './PoolManagementButton';
import { PoolCopyButton } from './PoolCopyButton';
import { PoolDateSelector } from './PoolDateSelector';
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
    const [currentRoundId, setCurrentRoundId] = useState(initialRoundId);

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
        if (isOpen && currentRoundId) {
            setIsLoading(true);
            setError(null);
            fetchData(currentRoundId);
        }
    }, [isOpen, currentRoundId]);

    // Update internal state if prop changes while closed or initially
    useEffect(() => {
        if (!isOpen) {
            setCurrentRoundId(initialRoundId);
        }
    }, [initialRoundId, isOpen]);

    const fetchData = async (id: string) => {
        const result = await getPoolResults(id);
        if (result.success && result.data) {
            // Reconstruct the winningsMap from the array
            const winningsMap = new Map<string, number>(result.data.winningsArray);
            setData({ ...result.data, winningsMap });
            setIsLoading(false);
        } else {
            setError(result.error || 'Failed to load pool data');
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex flex-col">
                    <h2 className="text-[18pt] font-black text-green-600 leading-tight text-left ml-3">$5 Pool Results</h2>
                    {data?.round && (
                        <p className="text-[12pt] text-gray-500 font-medium">
                            {new Date(data.round.date).toLocaleDateString()} {data.round.name ? `- ${data.round.name}` : ''}
                        </p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                >
                    Close
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
                            className="bg-black text-white px-6 py-2 rounded-full font-bold text-[14pt] hover:bg-gray-800 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <main className="px-1 py-4 max-w-5xl mx-auto w-full">
                        {/* Admin Action Bar (Replicating Page Style) */}
                        <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center justify-between gap-1 mb-4 shadow-sm">
                            <PoolDateSelector
                                allRounds={data.allRounds}
                                currentRoundId={currentRoundId}
                                onSelect={(id) => setCurrentRoundId(id)}
                            />
                            {isAdmin && (
                                <div className="flex gap-1 shrink-0">
                                    <PoolCopyButton
                                        date={data.round.date}
                                        roundName={data.round.name}
                                        isTournament={data.round.is_tournament}
                                        flights={data.processedFlights}
                                    />
                                    <button
                                        aria-label="Send Email"
                                        className="p-2.5 bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-white cursor-pointer"
                                        title="Send Email"
                                    >
                                        <Mail className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Main Results Dashboard Card */}
                        <div className="border border-gray-300 rounded-2xl overflow-hidden shadow-xl bg-white mb-10">
                            {/* Participants Header */}
                            <div className="bg-[#f3f4fa] border-b border-gray-300 px-1 py-4 flex justify-between items-center">
                                <h2 className="text-[14pt] font-bold text-gray-700">Pool Participants</h2>
                                <PoolManagementButton
                                    roundId={data.round.id}
                                    allPlayers={data.round.players.map((p: any) => ({ id: p.player_id, name: p.player.name }))}
                                    currentParticipantIds={data.allPoolParticipants.map((p: any) => p.player_id)}
                                />
                            </div>

                            <PoolResults
                                allPoolParticipants={data.allPoolParticipants}
                                poolActivePlayers={data.poolActivePlayers}
                                round={data.round}
                                flights={data.flights}
                                processedFlights={data.processedFlights}
                                winningsMap={data.winningsMap}
                            />
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}
