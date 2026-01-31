'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { calculatePlayerStats, comparePlayers as comparePlayersUtil, calculateCourseHandicapAfter } from '@/lib/player-stats';

// Dynamic import for code splitting
const ScorecardModal = dynamic(() => import('./ScorecardModal').then(mod => ({ default: mod.ScorecardModal })), {
    ssr: false,
    loading: () => null
});

const PoolModal = dynamic(() => import('./PoolModal').then(mod => mod.PoolModal), {
    ssr: false,
    loading: () => null
});

const ScoreCardsModal = dynamic(() => import('./ScoreCardsModal'), {
    ssr: false,
    loading: () => null
});

// Custom SVG Icons to bypass Lucide/Turbopack HMR bug
const TrophyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
    </svg>
);
import { getScorecardDetails } from '@/app/actions/get-scorecard';

type RoundWithPlayers = {
    id: string;
    date: string;
    name: string | null;
    isTournament: boolean;
    course: {
        holes: Array<{ holeNumber: number; par: number; difficulty: number }>;
        teeBoxes: Array<{ name: string; rating: number; slope: number }>;
    };
    players: Array<{
        id: string;
        grossScore: number | null;
        player: {
            id: string;
            name: string;
            handicapIndex: number;
            email?: string | null;
            preferredTeeBox?: string | null;
        };
        tee_box: {
            name: string;
            slope: number;
            rating: number;
        } | null;
        indexAtTime: number | null;
        indexAfter: number | null;
        points: number;
        payout: number;
        ytdPoints: number;
        inPool: boolean;
        scores: any[];
    }>;
};

export default function ScoresDashboard({
    rounds,
    isAdmin
}: {
    rounds: RoundWithPlayers[];
    isAdmin: boolean;
}) {
    const [visibleCount, setVisibleCount] = useState(5); // Show 5 rounds by default
    const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

    // Modal State
    const [selectedScorecard, setSelectedScorecard] = useState<any>(null);
    const [isLoadingScorecard, setIsLoadingScorecard] = useState<string | null>(null); // Stores ID of loading scorecard
    const [selectedPoolRoundId, setSelectedPoolRoundId] = useState<string | null>(null);
    const [selectedScoreCardsRound, setSelectedScoreCardsRound] = useState<any>(null);

    const visibleRounds = rounds.slice(0, visibleCount);
    const hasMore = visibleCount < rounds.length;

    const loadMore = () => {
        setVisibleCount(prev => prev + 5);
    };

    const toggleRound = (roundId: string) => {
        setExpandedRounds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(roundId)) {
                newSet.delete(roundId);
            } else {
                newSet.add(roundId);
            }
            return newSet;
        });
    };

    const handlePlayerClick = async (roundPlayerId: string) => {
        if (isLoadingScorecard) return; // Prevent double click
        setIsLoadingScorecard(roundPlayerId);

        const result = await getScorecardDetails(roundPlayerId);
        setIsLoadingScorecard(null);

        if (result.data) {
            setSelectedScorecard(result.data);
        } else {
            alert('Could not load scorecard details.');
        }
    };

    const handleCopyEmails = async (round: RoundWithPlayers) => {
        const emails = round.players
            .map(p => p.player.email)
            .filter(email => !!email)
            .join('; ');

        if (!emails) {
            alert('No emails found for players in this round.');
            return;
        }

        try {
            await navigator.clipboard.writeText(emails);
            alert('Player emails for this round copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy emails: ', err);
            alert('Failed to copy emails.');
        }
    };

    const handleCopyRound = async (round: RoundWithPlayers) => {
        // Prepare data (replicate flight logic)
        const par = round.course.holes.reduce((sum, h) => sum + h.par, 0);
        let flights: { name: string; players: any[] }[] = [];

        // Always use ALL players for copy
        const allPlayers = round.players || [];

        // Use shared utility for comparison
        const comparePlayers = (a: any, b: any) => comparePlayersUtil(a, b, round.course, par);


        if (round.isTournament) {
            const sortedByIdx = [...allPlayers].sort((a, b) => {
                const idxA = a.indexAtTime ?? a.player?.handicapIndex ?? 0;
                const idxB = b.indexAtTime ?? b.player?.handicapIndex ?? 0;
                return idxA - idxB;
            });
            const half = Math.floor(sortedByIdx.length / 2);
            const flight1Players = sortedByIdx.slice(0, half);
            const flight2Players = sortedByIdx.slice(half);

            flight1Players.sort(comparePlayers);
            flight2Players.sort(comparePlayers);

            flights = [
                { name: 'Flight 1', players: flight1Players },
                { name: 'Flight 2', players: flight2Players }
            ];
        } else {
            allPlayers.sort(comparePlayers);
            flights = [{ name: '', players: allPlayers }];
        }

        // Build HTML
        let html = `
        <div style="font-family: sans-serif;">
            <h2 style="margin-bottom: 5px;">${round.date ? format(new Date(round.date.split('T')[0] + 'T12:00:00'), 'MMMM d, yyyy') : 'Invalid Date'}</h2>
            ${round.name ? `<h3 style="color: blue; text-transform: uppercase;">${round.name}</h3>` : ''}
            ${round.isTournament ? `<p style="color: #b45309; font-weight: bold; text-transform: uppercase;">TOURNAMENT</p>` : ''}
        `;

        flights.forEach((flight, index) => {
            if (index > 0) {
                html += `<div style="border-top: 2px dashed #9ca3af; margin: 20px 0;"></div>`;
            }

            if (flight.name) html += `<h3 style="background: #f1f5f9; padding: 5px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">${flight.name}</h3>`;

            html += `
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 8px; text-align: left;">#</th>
                        <th style="padding: 8px; text-align: left;">Name</th>
                        ${round.isTournament ? `
                        <th style="padding: 8px; text-align: left;">$</th>
                        <th style="padding: 8px; text-align: left;">Pts</th>
                        <th style="padding: 8px; text-align: left;">YTD</th>
                        ` : ''}
                        <th style="padding: 8px; text-align: left;">Grs</th>
                        <th style="padding: 8px; text-align: left;">Hcp</th>
                        <th style="padding: 8px; text-align: left; background: #f8fafc;">Net</th>
                        <th style="padding: 8px; text-align: left;">Hcp</th>
                        <th style="padding: 8px; text-align: left;">Idx</th>
                    </tr>
                </thead>
                <tbody>
            `;

            flight.players.forEach((rp, idx) => {
                const idxBefore = rp.indexAtTime ?? rp.player.handicapIndex ?? 0;
                const idxAfter = rp.indexAfter;

                // Use shared utility for stats
                const stats = calculatePlayerStats(rp, round.course, par);
                const courseHandicap = stats.courseHandicap;
                const courseHandicapAfter = calculateCourseHandicapAfter(
                    idxAfter,
                    idxBefore,
                    stats.slope,
                    stats.rating,
                    par
                );

                const gross = rp.grossScore;
                const net = gross !== null ? gross - courseHandicap : null;

                html += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px; font-weight: bold;">${idx + 1}</td>
                        <td style="padding: 8px;">
                            <div style="font-weight: bold; color: #2563eb; text-transform: uppercase; text-decoration: underline; text-decoration-color: red;">${rp.player.name.split(' ')[0]}</div>
                            <div>${rp.player.name.split(' ').slice(1).join(' ')}</div>
                        </td>
                        ${round.isTournament ? `
                        <td style="padding: 8px; text-align: center; font-weight: bold; color: green; font-size: 1.1em;">
                            ${idx === 0 ? '$35' : idx === 1 ? '$25' : idx === 2 ? '$15' : '-'}
                        </td>
                        <td style="padding: 8px; text-align: center; font-weight: bold; color: #64748b;">
                            +${idx === 0 ? '100' : idx === 1 ? '75' : idx === 2 ? '50' : '20'}
                        </td>
                        <td style="padding: 8px; text-align: center; font-weight: bold; color: #2563eb;">
                            ${rp.ytdPoints || '-'}
                        </td>
                        ` : ''}
                        <td style="padding: 8px; text-align: center; font-weight: bold;">${gross ?? '-'}</td>
                        <td style="padding: 8px; text-align: center; font-weight: bold;">${courseHandicap}</td>
                        <td style="padding: 8px; text-align: center; background: #f8fafc; font-weight: bold; color: #2563eb; font-size: 1.1em;">${net ?? '-'}</td>
                         <td style="padding: 8px; text-align: center; font-weight: bold;">
                             <span style="color: ${courseHandicapAfter > courseHandicap ? 'green' : courseHandicapAfter < courseHandicap ? 'red' : 'black'}">${courseHandicapAfter}</span>
                         </td>
                        <td style="padding: 8px; text-align: center; font-weight: bold;">
                             <span style="color: ${(idxAfter ?? idxBefore) > idxBefore ? 'green' : (idxAfter ?? idxBefore) < idxBefore ? 'red' : 'black'}">${(idxAfter ?? idxBefore).toFixed(1)}</span>
                        </td>
                    </tr>
                 `;
            });
            html += `</tbody></table><br/>`;
        });
        html += `</div>`;

        const blob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([html.replace(/<[^>]*>?/gm, "")], { type: 'text/plain' });

        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blob,
                    'text/plain': textBlob
                })
            ]);
            alert('Round copied to clipboard for email!');
        } catch (e) {
            console.error(e);
            alert('Failed to copy');
        }
    };

    return (
        <div className="space-y-6">
            {visibleRounds.map((round) => {
                // Parse date consistently
                // Parse date consistently - handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS"
                const datePart = (round.date || '').split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day, 12, 0, 0);

                let dateStr = 'Invalid Date';
                let dayStr = '';

                try {
                    if (round.date) {
                        dateStr = format(dateObj, 'MMMM d, yyyy');
                        dayStr = format(dateObj, 'EEEE');
                    }
                } catch (e) {
                    console.error("Date error:", round.date, e);
                }

                // Calculate Par for this course
                const par = round.course.holes.reduce((sum, h) => sum + h.par, 0);

                let players = [...(round.players || [])];

                // Use shared utility for sorting
                players.sort((a, b) => comparePlayersUtil(a, b, round.course, par));


                const isExpanded = expandedRounds.has(round.id);
                const displayPlayers = isExpanded ? players : players.slice(0, 3);
                const hasMorePlayers = players.length > 3;

                return (
                    <div key={round.id} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
                        {/* Card Header */}
                        <div className="px-1 py-5 border-b border-slate-100 bg-white">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <TrophyIcon className={`w-5 h-5 sm:w-7 sm:h-7 ${round.isTournament ? 'text-yellow-500' : 'text-slate-300'}`} />
                                        <h2 className="font-black text-black text-[14pt] tracking-tight">
                                            {dateStr}
                                        </h2>
                                        {round.isTournament && (
                                            <span className="text-[14pt] font-black text-amber-700 bg-amber-100 px-1 sm:px-1 py-1 rounded border border-amber-200 uppercase tracking-widest leading-none">
                                                Tournament
                                            </span>
                                        )}
                                    </div>

                                    {round.name && (
                                        <div className="mt-1">
                                            <div className="text-blue-600 font-bold text-[14pt] tracking-[0.1em] sm:tracking-[0.15em] uppercase border border-slate-100 px-1 py-1 rounded inline-block bg-slate-50/50">
                                                {round.name}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 items-center justify-end">
                                    {
                                        (() => {
                                            const hasPool = round.players.some(p => p.inPool);
                                            return (
                                                <button
                                                    onClick={() => setSelectedPoolRoundId(round.id)}
                                                    className={`px-4 py-2 rounded-full text-[15pt] font-bold transition-colors shadow-sm cursor-pointer whitespace-nowrap border-2 ${hasPool
                                                        ? "bg-black text-white border-black hover:bg-gray-800"
                                                        : "bg-white text-black border-black hover:bg-gray-50"
                                                        }`}
                                                >
                                                    $5 Pool
                                                </button>
                                            );
                                        })()
                                    }
                                    <button
                                        onClick={() => setSelectedScoreCardsRound(round)}
                                        className="px-4 py-2 rounded-full text-[15pt] font-bold transition-colors shadow-sm cursor-pointer whitespace-nowrap bg-black text-white hover:bg-gray-800"
                                    >
                                        ScoreCards
                                    </button>
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => handleCopyRound(round)}
                                                className="p-2 text-white bg-black hover:bg-gray-800 rounded-full transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                                                title="Copy to Email"
                                            >
                                                <CopyIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleCopyEmails(round)}
                                                className="p-2 text-white bg-black hover:bg-gray-800 rounded-full transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                                                title="Copy Emails"
                                            >
                                                <MailIcon className="w-4 h-4" />
                                            </button>
                                            <Link
                                                href={`/scores/${round.id}/edit`}
                                                className="bg-black text-white text-[15pt] font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
                                            >
                                                Edit
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tournament Content */}
                        <div className="overflow-x-auto">
                            {(() => {
                                // Prepare Flights
                                let flights: { name: string; players: any[] }[] = [];
                                if (round.isTournament) {
                                    // First, sort by index to divide into flights
                                    const sortedByIdx = [...(round.players || [])].sort((a, b) => {
                                        const idxA = a.indexAtTime ?? a.player?.handicapIndex ?? 0;
                                        const idxB = b.indexAtTime ?? b.player?.handicapIndex ?? 0;
                                        return idxA - idxB;
                                    });

                                    const half = Math.floor(sortedByIdx.length / 2);
                                    const flight1Players = sortedByIdx.slice(0, half);
                                    const flight2Players = sortedByIdx.slice(half);

                                    // Sort using the shared utility
                                    flight1Players.sort((a, b) => comparePlayersUtil(a, b, round.course, par));
                                    flight2Players.sort((a, b) => comparePlayersUtil(a, b, round.course, par));

                                    flights = [
                                        { name: 'Flight 1', players: isExpanded ? flight1Players : flight1Players.slice(0, 3) },
                                        { name: 'Flight 2', players: isExpanded ? flight2Players : flight2Players.slice(0, 3) }
                                    ];
                                } else {
                                    flights = [{ name: '', players: displayPlayers || [] }];
                                }

                                return flights.map((flight, fIdx) => (
                                    <div key={fIdx} className={fIdx > 0 ? 'border-t-8 border-slate-50' : ''}>
                                        {flight.name && (
                                            <div className="px-1 py-3 bg-slate-50/50 border-b border-slate-100">
                                                <h3 className="text-[14pt] font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
                                                    {flight.name}
                                                </h3>
                                            </div>
                                        )}
                                        <table className="w-full text-sm">
                                            <thead className="text-[14pt] text-black font-black tracking-[0.05em] sm:tracking-[0.1em] border-b border-slate-100 bg-white">
                                                <tr>
                                                    <th className="px-1 py-4 text-center w-6 sm:w-10">#</th>
                                                    <th className="px-1 py-4 text-left whitespace-nowrap">Name</th>
                                                    {round.isTournament && (
                                                        <>
                                                            <th className="px-1 py-4 text-center text-green-600">$</th>
                                                            <th className="px-1 py-4 text-center">Pts</th>
                                                            <th className="px-1 py-4 text-center text-blue-600">YTD</th>
                                                        </>
                                                    )}
                                                    <th className="px-1 py-4 text-center">Grs</th>
                                                    <th className="px-1 py-4 text-center">Hcp</th>
                                                    <th className="px-1 py-4 text-center bg-slate-50/50">Net</th>
                                                    <th className="px-1 py-4 text-center">Hcp</th>
                                                    <th className="px-1 py-4 text-center">Idx</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {flight.players.map((rp, pIdx) => {
                                                    const player = rp.player;
                                                    const firstName = player.name.split(' ')[0];
                                                    const lastName = player.name.split(' ').slice(1).join(' ');

                                                    const idxBefore = rp.indexAtTime ?? player.handicapIndex ?? 0;
                                                    const idxAfter = rp.indexAfter;

                                                    // Use shared utility for stats
                                                    const stats = calculatePlayerStats(rp, round.course, par);
                                                    const courseHandicap = stats.courseHandicap;
                                                    const courseHandicapAfter = calculateCourseHandicapAfter(
                                                        idxAfter,
                                                        idxBefore,
                                                        stats.slope,
                                                        stats.rating,
                                                        par
                                                    );

                                                    const hasIndexChanged = idxAfter !== null && Math.abs(idxAfter - idxBefore) > 0.05;
                                                    const hcpColor = courseHandicapAfter > courseHandicap ? "text-green-600" : courseHandicapAfter < courseHandicap ? "text-red-600" : "text-black";
                                                    const idxDiff = (idxAfter ?? idxBefore) - idxBefore;
                                                    const idxColor = idxDiff > 0.05 ? "text-green-600" : idxDiff < -0.05 ? "text-red-600" : "text-black";

                                                    const gross = rp.grossScore;
                                                    const net = gross !== null ? gross - courseHandicap : null;

                                                    const isLoading = isLoadingScorecard === rp.id;

                                                    return (
                                                        <tr key={rp.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-1 sm:px-1 py-3 text-center text-black font-bold text-[14pt]">
                                                                {pIdx === 0 ? "🏆" : pIdx === 1 ? "🥈" : pIdx === 2 ? "🥉" : pIdx + 1}
                                                            </td>
                                                            <td className="px-1 py-3">
                                                                <button
                                                                    onClick={() => handlePlayerClick(rp.id)}
                                                                    disabled={isLoading}
                                                                    className="text-left group/name flex flex-col whitespace-nowrap cursor-pointer"
                                                                >
                                                                    <span className="font-bold text-blue-600 text-[14pt] underline decoration-2 decoration-black group-hover/name:text-blue-700 group-hover/name:decoration-black transition-colors uppercase leading-tight">
                                                                        {firstName}
                                                                    </span>
                                                                    <span className="text-[14pt] text-black font-medium leading-none">
                                                                        {lastName}
                                                                    </span>
                                                                    {isLoading && <LoaderIcon className="w-3 h-3 animate-spin text-slate-300 mt-1" />}
                                                                </button>
                                                            </td>
                                                            {round.isTournament && (
                                                                <>
                                                                    <td className="px-1 py-3 text-center">
                                                                        <span className="font-black text-green-600 text-[14pt]">
                                                                            {pIdx === 0 ? '$35' : pIdx === 1 ? '$25' : pIdx === 2 ? '$15' : '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-1 sm:px-1 py-3 text-center">
                                                                        <span className="font-bold text-slate-500 text-[14pt]">
                                                                            +{pIdx === 0 ? '100' : pIdx === 1 ? '75' : pIdx === 2 ? '50' : '20'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-1 sm:px-1 py-3 text-center">
                                                                        <span className="font-bold text-blue-600 text-[14pt]">
                                                                            {rp.ytdPoints || '-'}
                                                                        </span>
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="px-1 sm:px-1 py-3 text-center font-bold text-black text-[14pt]">{gross ?? '-'}</td>
                                                            <td className="px-1 sm:px-1 py-3 text-center font-bold text-black text-[14pt]">{courseHandicap}</td>
                                                            <td className="px-1 sm:px-1 py-3 text-center bg-slate-50/50">
                                                                <span className="font-black text-blue-600 text-[14pt]">
                                                                    {net ?? '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-1 sm:px-1 py-3 text-center">
                                                                <div className="flex items-center justify-center gap-1 leading-none">
                                                                    <span className={`text-[14pt] font-black ${hcpColor}`}>{courseHandicapAfter}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-1 sm:px-1 py-3 text-center">
                                                                <div className="flex items-center justify-center gap-1 leading-none">
                                                                    <span className={`text-[14pt] font-black ${idxColor}`}>{(idxAfter ?? idxBefore).toFixed(1)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ));
                            })()}
                        </div>

                        {hasMorePlayers && (
                            <div className="p-1 bg-slate-50/50 text-center border-t border-slate-100">
                                <button
                                    onClick={() => toggleRound(round.id)}
                                    className="text-slate-500 hover:text-black font-black text-[14pt] uppercase tracking-widest transition-colors cursor-pointer"
                                >
                                    {isExpanded ? 'Show less' : `+${round.players.length - 3} more player${round.players.length - 3 !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {
                visibleRounds.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <p className="text-gray-400 font-medium">No rounds found.</p>
                        <p className="text-sm text-gray-400 mt-1">Add a round to get started.</p>
                    </div>
                )
            }

            {
                hasMore && (
                    <div className="flex justify-center pt-4">
                        <button
                            onClick={loadMore}
                            className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
                        >
                            More Rounds
                        </button>
                    </div>
                )
            }

            {/* Scorecard Modal */}
            {
                selectedScorecard && (
                    <ScorecardModal
                        data={selectedScorecard}
                        isOpen={!!selectedScorecard}
                        onClose={() => setSelectedScorecard(null)}
                    />
                )
            }
            {/* Pool Modal */}
            {selectedPoolRoundId && (
                <PoolModal
                    roundId={selectedPoolRoundId}
                    isOpen={!!selectedPoolRoundId}
                    onClose={() => setSelectedPoolRoundId(null)}
                />
            )}
            {/* ScoreCards Modal */}
            {selectedScoreCardsRound && (
                <ScoreCardsModal
                    isOpen={!!selectedScoreCardsRound}
                    onClose={() => setSelectedScoreCardsRound(null)}
                    roundPlayers={selectedScoreCardsRound.players}
                    holes={selectedScoreCardsRound.course.holes}
                    coursePar={selectedScoreCardsRound.course.holes.reduce((sum: number, h: any) => sum + h.par, 0)}
                />
            )}
        </div >
    );
}
