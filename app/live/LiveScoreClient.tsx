'use client';
// build-trigger: 1.0.6

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { Bird, Copy, Mail, Send } from 'lucide-react';
import { LivePlayerSelectionModal } from '@/components/LivePlayerSelectionModal';
import { LiveRoundModal } from '@/components/LiveRoundModal';
import { GuestPlayerModal } from '@/components/GuestPlayerModal';
import ConfirmModal from '@/components/ConfirmModal';
import AddToClubModal from '@/components/AddToClubModal';
import { PoolModal } from '@/components/PoolModal';

import { createLiveRound, addPlayerToLiveRound, saveLiveScore, deleteLiveRound, addGuestToLiveRound, updateGuestInLiveRound, deleteGuestFromLiveRound } from '@/app/actions/create-live-round';
import { copyLiveToClub } from '@/app/actions/copy-live-to-club';
import { generateScorecardHtml, generateClipboardHtml } from '@/app/lib/scorecard-helper';
import { LiveLeaderboardCard } from './LiveLeaderboardCard';

import { removePlayerFromLiveRound } from '@/app/actions/remove-player-from-live-round'; // Force reload
import { sendScorecardEmail } from '@/app/actions/send-scorecard';
import { deleteUserLiveRound } from '@/app/actions/delete-user-round';
import { logout } from '@/app/actions/auth';
import { getAllCourses } from '@/app/actions/get-all-courses';


interface Player {
    id: string;
    name: string;
    index: number;
    preferred_tee_box: string | null;
    email?: string | null;
    isGuest?: boolean;
    liveRoundPlayerId?: string; // LiveRoundPlayer ID for server actions
    scorerId?: string | null; // Scorer tracking
    liveRoundData?: {
        tee_box_name: string | null;
        course_hcp: number | null;
    } | null;
    thru?: string | number;
    totalGross?: number;
    totalNet?: number;
}

interface Hole {
    holeNumber: number;
    par: number;
    difficulty?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    elements?: HoleElement[];
}

interface HoleElement {
    id: string;
    side: string;
    elementNumber: number;
    frontLatitude?: number | null;
    frontLongitude?: number | null;
    backLatitude?: number | null;
    backLongitude?: number | null;
    water?: boolean;
    bunker?: boolean;
    tree?: boolean;
}

interface Course {
    id: string;
    name: string;
    teeBoxes: {
        id: string;
        name: string;
        rating: number;
        slope: number;
    }[];
    holes: Hole[];
}

interface LiveScoreClientProps {
    allPlayers: Player[];
    defaultCourse: Course | null;
    initialRound?: any;
    todayStr: string; // Pass from server to avoid hydration mismatch
    allLiveRounds: Array<{
        id: string;
        name: string;
    }>;
    allCourses: Course[];
    isAdmin: boolean;
    currentUserId?: string;
    currentUserName?: string;
    lastUsedCourseId?: string | null;
    lastUsedTeeBoxId?: string | null;
}

export default function LiveScoreClient({
    allPlayers,
    defaultCourse,
    initialRound,
    todayStr,
    allLiveRounds,
    allCourses,
    isAdmin: isAdminProp,
    currentUserId,
    currentUserName,
    lastUsedCourseId,
    lastUsedTeeBoxId,
}: LiveScoreClientProps) {
    const router = useRouter();
    // Initialize State from Server Data
    const [liveRoundId, setLiveRoundId] = useState<string | null>(initialRound?.id || null);

    const [isAdmin, setIsAdmin] = useState(isAdminProp); // Initialize with server-side value
    // Start with empty selection - each device manages its own group
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
    const [isSaving, setIsSaving] = useState(false); // Used to show 'Saving' state on button

    const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
    const [roundModalMode, setRoundModalMode] = useState<'new' | 'edit'>('new');
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [guestPlayers, setGuestPlayers] = useState<Player[]>([]);
    const [editingGuest, setEditingGuest] = useState<{ id: string; name: string; index: number; courseHandicap: number } | null>(null);
    const [isAddToClubModalOpen, setIsAddToClubModalOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
    const [isRoundSelectModalOpen, setIsRoundSelectModalOpen] = useState(false);
    const [lazyLoadedCourses, setLazyLoadedCourses] = useState<Course[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);


    const [birdiePlayers, setBirdiePlayers] = useState<Array<{ name: string; totalBirdies: number }>>([]);
    const [eaglePlayers, setEaglePlayers] = useState<Array<{ name: string; totalEagles: number }>>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // Track pending (unsaved) scores for the current hole only
    const [pendingScores, setPendingScores] = useState<Map<string, number>>(new Map());
    // Track holes that failed to save to database (for retry after round is complete)
    const [unsavedToDbHoles, setUnsavedToDbHoles] = useState<Map<number, Array<{ playerId: string; strokes: number }>>>(new Map());
    const [summaryEditCell, setSummaryEditCell] = useState<{ playerId: string, holeNumber: number } | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isGPSEnabled, setIsGPSEnabled] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
        confirmText?: string;
        cancelText?: string;
        hideCancel?: boolean;
    } | null>(null);



    // Unique ID for this scoring device
    // Use hydration-safe initialization
    const [clientScorerId, setClientScorerId] = useState('');
    useEffect(() => {
        let id = localStorage.getItem('live_scoring_device_id');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('live_scoring_device_id', id);
        }
        setClientScorerId(id);
    }, []);

    // Restore selected players from localStorage on mount
    useEffect(() => {
        if (!liveRoundId) return;

        const savedPlayerIds = localStorage.getItem(`live_scoring_my_group_${liveRoundId}`);
        if (savedPlayerIds) {
            try {
                const playerIds: string[] = JSON.parse(savedPlayerIds);
                const allAvailable = [...allPlayers, ...guestPlayers];
                const restoredPlayers = playerIds
                    .map(id => allAvailable.find(p => p.id === id))
                    .filter((p): p is Player => p !== undefined);

                if (restoredPlayers.length > 0) {
                    setSelectedPlayers(restoredPlayers);
                }
            } catch (e) {
                console.error('Failed to restore selected players from localStorage:', e);
            }
        }
    }, [liveRoundId, allPlayers, guestPlayers]);




    const showAlert = (title: string, message: string) => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => setConfirmConfig(null),
            hideCancel: true,
            confirmText: 'OK'
        });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmConfig(null);
            },
            isDestructive
        });
    };





    // GPS Logic with fallback for desktop
    useEffect(() => {
        if (!navigator.geolocation || !isGPSEnabled) {
            // Clear location when GPS is disabled
            if (!isGPSEnabled) {
                setUserLocation(null);
            }
            return;
        }

        let watchId: number | null = null;
        let hasGotLocation = false;
        let lastLocation: { latitude: number; longitude: number } | null = null;

        // Helper function to check if location has changed significantly (>5 meters)
        const hasLocationChanged = (newLat: number, newLon: number): boolean => {
            if (!lastLocation) return true;

            // Haversine formula to calculate distance in meters
            const R = 6371e3; // Earth's radius in meters
            const φ1 = lastLocation.latitude * Math.PI / 180;
            const φ2 = newLat * Math.PI / 180;
            const Δφ = (newLat - lastLocation.latitude) * Math.PI / 180;
            const Δλ = (newLon - lastLocation.longitude) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            return distance > 5; // Only update if moved more than 5 meters
        };

        const updateLocation = (latitude: number, longitude: number) => {
            if (hasLocationChanged(latitude, longitude)) {
                lastLocation = { latitude, longitude };
                setUserLocation({ latitude, longitude });
            }
        };

        // First, try to get an initial position with fallback strategy
        const getInitialPosition = () => {
            // Try high accuracy first (for mobile with GPS)
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    hasGotLocation = true;
                    updateLocation(position.coords.latitude, position.coords.longitude);

                    // Start watching with high accuracy
                    watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            updateLocation(position.coords.latitude, position.coords.longitude);
                        },
                        (error) => {
                            // Silent watch error
                        },
                        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
                    );
                },
                (error) => {
                    // High accuracy failed, try low accuracy (for desktop)
                    // Silent retry

                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            hasGotLocation = true;
                            updateLocation(position.coords.latitude, position.coords.longitude);

                            // Start watching with low accuracy
                            watchId = navigator.geolocation.watchPosition(
                                (pos) => {
                                    updateLocation(pos.coords.latitude, pos.coords.longitude);
                                },
                                () => { /* Silent error */ },
                                { enableHighAccuracy: false, timeout: 60000, maximumAge: 30000 }
                            );
                        },
                        () => { /* Silent error - handled by UI status */ },
                        { enableHighAccuracy: false, timeout: 60000, maximumAge: 30000 }
                    );
                },
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
            );
        };

        getInitialPosition();

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isGPSEnabled]);

    // Disable scroll restoration to prevent jumps on refresh
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c; // in metres
        return Math.round(d * 1.09361); // convert to yards
    };

    // Load saved group from localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        try {
            const currentId = initialRound?.id;
            if (!currentId) return;

            localStorage.setItem('live_scoring_last_round_id', currentId);

            // Load guest players from database
            const guestsFromDb: Player[] = [];
            if (initialRound?.players) {
                initialRound.players.forEach((p: any) => {
                    if (p.is_guest) {
                        guestsFromDb.push({
                            id: p.id, // Use LiveRoundPlayer ID
                            name: p.guest_name || 'Guest',
                            index: p.index_at_time,
                            preferred_tee_box: null,
                            isGuest: true,
                            liveRoundData: {
                                tee_box_name: p.tee_box_name,
                                course_hcp: p.course_handicap
                            }
                        });
                    }
                });
            }
            setGuestPlayers(guestsFromDb);

            // Restore selected players (both regular and guests from database) - Namespaced by round ID
            const roundSpecificKey = `live_scoring_my_group_${currentId}`;
            const saved = localStorage.getItem(roundSpecificKey);
            if (saved) {
                const savedIds = JSON.parse(saved);
                // Combine allPlayers with guest players from database
                const allAvailablePlayers = [...allPlayers, ...guestsFromDb];
                const restored = savedIds.map((id: string) =>
                    allAvailablePlayers.find((p: Player) => p.id === id)
                ).filter((p: Player | undefined): p is Player => p !== undefined);

                if (restored.length > 0) {
                    setSelectedPlayers(restored);
                } else if (isAdmin && initialRound?.players) {
                    // Admin Fallback: If no local selection, select EVERYONE in the round.
                    const allRoundPlayers: Player[] = [];
                    initialRound.players.forEach((p: any) => {
                        if (p.is_guest) {
                            allRoundPlayers.push({
                                id: p.id,
                                name: p.guest_name || 'Guest',
                                index: p.index_at_time,
                                preferred_tee_box: null,
                                isGuest: true,
                                liveRoundData: { tee_box_name: p.tee_box_name, course_hcp: p.course_handicap }
                            });
                        } else if (p.player) {
                            allRoundPlayers.push({
                                id: p.player.id,
                                name: p.player.name,
                                index: p.player.index,
                                preferred_tee_box: p.player.preferred_tee_box,
                                liveRoundData: { tee_box_name: p.tee_box_name, course_hcp: p.course_handicap }
                            });
                        }
                    });
                    setSelectedPlayers(allRoundPlayers);
                } else {
                    setSelectedPlayers([]); // Clear if no valid players found
                }
            } else if (isAdmin && initialRound?.players) {
                // Admin Fallback: If no saved data, select EVERYONE in the round.
                const allRoundPlayers: Player[] = [];
                initialRound.players.forEach((p: any) => {
                    if (p.is_guest) {
                        allRoundPlayers.push({
                            id: p.id,
                            name: p.guest_name || 'Guest',
                            index: p.index_at_time,
                            preferred_tee_box: null,
                            isGuest: true,
                            liveRoundData: { tee_box_name: p.tee_box_name, course_hcp: p.course_handicap }
                        });
                    } else if (p.player) {
                        allRoundPlayers.push({
                            id: p.player.id,
                            name: p.player.name,
                            index: p.player.index,
                            preferred_tee_box: p.player.preferred_tee_box,
                            liveRoundData: { tee_box_name: p.tee_box_name, course_hcp: p.course_handicap }
                        });
                    }
                });
                setSelectedPlayers(allRoundPlayers);
            } else {
                setSelectedPlayers([]); // No saved data, start empty
            }
        } catch (e) {
            console.error("Failed to load saved players", e);
            setSelectedPlayers([]); // On error, start empty
            setGuestPlayers([]); // On error, clear guests
        }
    }, [initialRound, isAdmin]);

    const [scores, setScores] = useState<Map<string, Map<number, number>>>(() => {
        const initialMap = new Map();
        if (initialRound?.players) {
            initialRound.players.forEach((p: any) => {
                const playerScores = new Map<number, number>();
                if (p.scores) {
                    p.scores.forEach((s: any) => {
                        if (s.hole?.holeNumber) {
                            playerScores.set(s.hole.holeNumber, s.strokes);
                        }
                    });
                }
                // Use LiveRoundPlayer ID for guests, player.id for regular players
                const playerId = p.is_guest ? p.id : p.player?.id;
                if (playerId) {
                    initialMap.set(playerId, playerScores);
                }
            });
        }
        return initialMap;
    });

    // Auto-select current user if no selection exists (Backup for new rounds/first load)
    useEffect(() => {
        if (!initialRound?.players || selectedPlayers.length > 0 || !currentUserId) return;

        // Try to find myself in the round
        const myEntry = initialRound.players.find((p: any) =>
            (p.player && p.player.id === currentUserId) ||
            (p.is_guest && p.id === currentUserId)
        );

        if (myEntry) {
            // Construct Player object
            const isGuest = myEntry.is_guest;
            if (!isGuest && !myEntry.player) return;

            const playerObj: Player = {
                id: isGuest ? myEntry.id : myEntry.player.id,
                name: isGuest ? (myEntry.guest_name || 'Guest') : myEntry.player.name,
                index: isGuest ? myEntry.index_at_time : myEntry.player.index,
                preferred_tee_box: isGuest ? null : myEntry.player.preferred_tee_box,
                isGuest: !!isGuest,
                liveRoundData: {
                    tee_box_name: myEntry.tee_box_name,
                    course_hcp: myEntry.course_handicap
                }
            };

            setSelectedPlayers([playerObj]);

            // Also save to LS to persist future reloads
            if (initialRound.id) {
                localStorage.setItem(`live_scoring_my_group_${initialRound.id}`, JSON.stringify([playerObj.id]));
            }
        }
    }, [initialRound, currentUserId, selectedPlayers.length]);




    // Sync local scores with server data when it updates (e.g. after refresh)
    useEffect(() => {
        if (initialRound?.players) {
            // ENFORCE SINGLE DEVICE SCORING
            if (clientScorerId) {
                const takenOverIds = new Set<string>();
                initialRound.players.forEach((p: any) => {
                    const playerId = p.is_guest ? p.id : p.player?.id;
                    if (!playerId) return;
                    if (p.scorer_id && p.scorer_id !== clientScorerId) {
                        takenOverIds.add(playerId);
                    }
                });

                if (takenOverIds.size > 0) {
                    setSelectedPlayers(prev => {
                        const hasTakenOver = prev.some(p => takenOverIds.has(p.id));
                        if (!hasTakenOver) return prev;
                        const filtered = prev.filter(p => !takenOverIds.has(p.id));
                        if (liveRoundId) {
                            localStorage.setItem(`live_scoring_my_group_${liveRoundId}`, JSON.stringify(filtered.map(p => p.id)));
                        }
                        return filtered;
                    });
                }
            }

            setScores(prev => {
                const next = new Map(prev);

                // Load Local Backup (for reload survival)
                let localBackup = new Map<string, Map<number, number>>();
                if (typeof window !== 'undefined' && initialRound?.id) {
                    try {
                        const raw = localStorage.getItem(`live_scores_backup_${initialRound.id}`);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            parsed.forEach(([pid, arr]: any) => {
                                localBackup.set(pid, new Map(arr));
                            });
                        }
                    } catch (e) { }
                }
                initialRound.players.forEach((p: any) => {
                    // Use LiveRoundPlayer ID for guests, player.id for regular players
                    const playerId = p.is_guest ? p.id : p.player?.id;
                    if (!playerId) return;

                    // Reconstruct server scores for this player
                    const serverPlayerScores = new Map<number, number>();
                    if (p.scores) {
                        p.scores.forEach((s: any) => {
                            if (s.hole?.holeNumber) {
                                serverPlayerScores.set(s.hole.holeNumber, s.strokes);
                            }
                        });
                    }

                    const existingLocalScores = next.get(playerId) || new Map();
                    const backupScores = localBackup.get(playerId);
                    // Start with server scores (Source of Truth)
                    const mergedScores = new Map(serverPlayerScores);

                    // Merge in Backup (if server missing)
                    if (backupScores) {
                        backupScores.forEach((v, k) => {
                            if (!mergedScores.has(k)) mergedScores.set(k, v);
                        });
                    }

                    // Merge in local scores that are NOT in server scores (Pending/Optimistic)
                    // If server has a hole score, it overwrites local (correct for synchronization)
                    // If server doesn't have a hole score, but local does, we KEEP local (fixes the "disappearing score" bug)
                    existingLocalScores.forEach((strokes, holeNum) => {
                        if (!mergedScores.has(holeNum)) {
                            mergedScores.set(holeNum, strokes);
                        }
                    });

                    next.set(playerId, mergedScores);
                });
                return next;
            });
        }
    }, [initialRound]);




    // Global Score Watcher (Birdies & Eagles)
    const knownBirdiesRef = useRef<Map<string, Set<number>>>(new Map());
    const knownEaglesRef = useRef<Map<string, Set<number>>>(new Map());
    const hasInitializedRef = useRef(false);
    const lastRoundIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!initialRound?.players || !defaultCourse) return;

        // Reset tracking if round changed (e.g., after deletion or switching rounds)
        if (lastRoundIdRef.current !== initialRound.id) {
            knownBirdiesRef.current.clear();
            knownEaglesRef.current.clear();
            hasInitializedRef.current = false;
            lastRoundIdRef.current = initialRound.id;
        }

        const newBirdies: { name: string; totalBirdies: number }[] = [];
        const newEagles: { name: string; totalEagles: number }[] = [];

        initialRound.players.forEach((p: any) => {
            const playerId = p.is_guest ? p.id : p.player?.id;
            if (!playerId) return;

            // Init Birdie Ref
            if (!knownBirdiesRef.current.has(playerId)) knownBirdiesRef.current.set(playerId, new Set());

            // Init Eagle Ref
            if (!knownEaglesRef.current.has(playerId)) knownEaglesRef.current.set(playerId, new Set());
            const playerEagleSet = knownEaglesRef.current.get(playerId)!;
            const playerKnownSet = knownBirdiesRef.current.get(playerId)!;
            let playerHasNewBirdie = false;
            let playerHasNewEagle = false;

            if (p.scores) {
                p.scores.forEach((s: any) => {
                    if (s.hole?.holeNumber && s.strokes) {
                        const hole = defaultCourse.holes.find(h => h.holeNumber === s.hole.holeNumber);
                        if (hole) {
                            const diff = s.strokes - hole.par;

                            // Birdie Check
                            if (diff === -1) {
                                if (!playerKnownSet.has(s.hole.holeNumber)) {
                                    playerKnownSet.add(s.hole.holeNumber);
                                    if (hasInitializedRef.current) playerHasNewBirdie = true;
                                }
                            }

                            // Eagle Check
                            if (diff <= -2) {
                                if (!playerEagleSet.has(s.hole.holeNumber)) {
                                    playerEagleSet.add(s.hole.holeNumber);
                                    if (hasInitializedRef.current) playerHasNewEagle = true;
                                }
                            }
                        }
                    }
                });
            }

            if (playerHasNewBirdie) {
                newBirdies.push({
                    name: p.is_guest ? (p.guest_name || 'Guest') : p.player?.name || 'Unknown',
                    totalBirdies: playerKnownSet.size
                });
            }
            if (playerHasNewEagle) {
                newEagles.push({
                    name: p.is_guest ? (p.guest_name || 'Guest') : p.player?.name || 'Unknown',
                    totalEagles: playerEagleSet.size
                });
            }
        });

        if (newBirdies.length > 0) {
            setBirdiePlayers(prev => {
                const existingNames = new Set(prev.map(x => x.name));
                const uniqueNew = newBirdies.filter(x => !existingNames.has(x.name));
                if (uniqueNew.length === 0) return prev;
                return [...prev, ...uniqueNew];
            });
        }

        if (newEagles.length > 0) {
            setEaglePlayers(prev => {
                const existingNames = new Set(prev.map(x => x.name));
                const uniqueNew = newEagles.filter(x => !existingNames.has(x.name));
                if (uniqueNew.length === 0) return prev;
                return [...prev, ...uniqueNew];
            });
        }


        hasInitializedRef.current = true;

    }, [initialRound, defaultCourse]); // Global watcher: All devices see birdie/eagle popups. Round ID tracking prevents false triggers after deletion.


    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const searchParams = useSearchParams();

    // Initialize activeHole from URL, or calculate the first incomplete hole (Server Safe)
    const [activeHole, setActiveHole] = useState(() => {
        // 1. Priority: URL Parameter (for sharing links)
        const urlHole = searchParams.get('hole');
        if (urlHole) {
            const h = parseInt(urlHole);
            if (h >= 1 && h <= 18) return h;
        }

        // 2. Priority: First incomplete hole (Server & Client fallback)
        if (!initialRound?.players || initialRound.players.length === 0) return 1;

        for (let h = 1; h <= 18; h++) {
            const allPlayersHaveScore = initialRound.players.every((p: any) => {
                return p.scores && p.scores.some((s: any) => s.hole?.holeNumber === h);
            });

            if (!allPlayersHaveScore) {
                return h;
            }
        }
        return 1;
    });

    // Hydration Fix: Restore from LocalStorage on client mount only (if no URL param)
    useEffect(() => {
        if (!initialRound?.id) return;
        const savedHole = localStorage.getItem(`live_scoring_active_hole_${initialRound.id}`);
        // Only load from LS if URL didn't specify a hole
        if (savedHole && !searchParams.get('hole')) {
            const h = parseInt(savedHole);
            if (h >= 1 && h <= 18 && h !== activeHole) {
                setActiveHole(h);
            }
        }
    }, [initialRound?.id]); // Run once on mount per round

    // Sync activeHole to URL and LocalStorage whenever it changes
    useEffect(() => {
        if (liveRoundId) {
            localStorage.setItem(`live_scoring_active_hole_${liveRoundId}`, activeHole.toString());
        }

        const currentHole = searchParams.get('hole');
        if (currentHole === activeHole.toString()) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('hole', activeHole.toString());
        router.replace(`?${params.toString()}`, { scroll: false });
    }, [activeHole, liveRoundId, searchParams, router]);


    // Cleanup state when moving to a new hole
    useEffect(() => {
        setHasUnsavedChanges(false);
        setPendingScores(new Map());
    }, [activeHole]);
    // Check admin status on mount and listen for changes
    useEffect(() => {
        const checkAdmin = () => {
            const adminCookie = Cookies.get('admin_session');
            setIsAdmin(adminCookie === 'true');
        };

        checkAdmin();

        window.addEventListener('admin-change', checkAdmin);
        return () => window.removeEventListener('admin-change', checkAdmin);
    }, []);

    // State to toggle visibility of top detail sections (Round Selector & Course Info)
    const [showDetails, setShowDetails] = useState(true);
    const [isRoundDropdownOpen, setIsRoundDropdownOpen] = useState(false);





    // Auto-select next available hole for the specific group - DISABLED to allow manual hole selection
    // useEffect(() => {
    //     if (selectedPlayers.length === 0) return;

    //     for (let h = 1; h <= 18; h++) {
    //         const allHaveScore = selectedPlayers.every(p => {
    //             const pScores = scores.get(p.id);
    //             return pScores && pScores.has(h);
    //         });
    //         if (!allHaveScore) {
    //             setActiveHole(h);
    //             return;
    //         }
    //     }
    // }, [selectedPlayers]); // Intentionally not including scores to avoid jumping while scoring

    const activeHolePar = defaultCourse?.holes.find(h => h.holeNumber === activeHole)?.par || 4;
    const activeHoleDifficulty = defaultCourse?.holes.find(h => h.holeNumber === activeHole)?.difficulty;

    // Helper to split name into first and last
    const splitName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return { first: parts[0], last: '' };
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return { first, last };
    };

    const getScore = (playerId: string, holeNumber: number): number | null => {
        // For the active hole, show pending score if it exists
        if (holeNumber === activeHole && pendingScores.has(playerId)) {
            return pendingScores.get(playerId) ?? null;
        }
        // Otherwise show saved score
        return scores.get(playerId)?.get(holeNumber) ?? null;
    };

    // Get only saved scores (no pending) - use this for summary/leaderboard
    const getSavedScore = (playerId: string, holeNumber: number): number | null => {
        return scores.get(playerId)?.get(holeNumber) ?? null;
    };

    const getPlayerTee = (player: Player) => {
        if (!defaultCourse) return null;

        // 1. Try to use player's preferred tee box if available for this course
        if (player.preferred_tee_box) {
            const match = defaultCourse.teeBoxes.find(t => t.name.toLowerCase() === player.preferred_tee_box?.toLowerCase());
            if (match) return match;
            const partial = defaultCourse.teeBoxes.find(t => t.name.toLowerCase().includes(player.preferred_tee_box!.toLowerCase()));
            if (partial) return partial;
        }

        // For other courses, or if no preference, use the round's tee box
        // Try to get from initialRound first (the selected tee for this round)
        if (initialRound?.rating && initialRound?.slope) {
            const roundTee = defaultCourse.teeBoxes.find(t =>
                t.rating === initialRound.rating && t.slope === initialRound.slope
            );
            if (roundTee) return roundTee;
        }

        // Fallback to White tee or first available
        const white = defaultCourse.teeBoxes.find(t => t.name.toLowerCase().includes('white'));
        return white || defaultCourse.teeBoxes[0];
    };

    const getCourseHandicap = (player: Player): number => {
        // Prefer server-side snapshot if available
        if (player.liveRoundData?.course_hcp !== undefined && player.liveRoundData.course_hcp !== null) {
            return player.liveRoundData.course_hcp;
        }

        const teeBox = getPlayerTee(player);
        if (!teeBox) return 0;

        const rating = teeBox.rating;
        const slope = teeBox.slope;
        const coursePar = initialRound?.par ?? (defaultCourse?.holes.reduce((sum, h) => sum + h.par, 0) || 72);

        const ch = ((player.index || 0) * slope / 113) + (rating - coursePar);
        return Math.round(ch) || 0;
    };

    const handleAddGuest = async (guest: { name: string; index: number; courseHandicap: number }) => {
        if (!liveRoundId || !initialRound) {
            showAlert('Error', 'No active live round found');
            return;
        }

        console.log('Adding guest to database:', guest);

        // Add guest to database
        const result = await addGuestToLiveRound({
            liveRoundId,
            guestName: guest.name,
            index: guest.index,
            courseHandicap: guest.courseHandicap,
            rating: initialRound.rating,
            slope: initialRound.slope,
            par: initialRound.par,
            scorerId: isAdmin ? undefined : clientScorerId
        });

        if (result.success && result.guestPlayerId) {
            console.log('Guest added successfully, refreshing page');

            // Add to local storage so it appears in "My Group" after refresh
            const saved = localStorage.getItem('live_scoring_my_group');
            let currentIds: string[] = saved ? JSON.parse(saved) : [];
            if (!currentIds.includes(result.guestPlayerId)) {
                currentIds.push(result.guestPlayerId);
                localStorage.setItem(`live_scoring_my_group_${liveRoundId}`, JSON.stringify(currentIds));
            }

            // Refresh the page to load the new guest
            router.refresh();
        } else {
            showAlert('Error', 'Failed to add guest: ' + result.error);
        }
    };

    const handleUpdateGuest = async (guestId: string, guestData: { name: string; index: number; courseHandicap: number }) => {
        console.log('Updating guest in database:', guestId, guestData);

        const result = await updateGuestInLiveRound({
            guestPlayerId: guestId,
            guestName: guestData.name,
            index: guestData.index,
            courseHandicap: guestData.courseHandicap
        });

        if (result.success) {
            console.log('Guest updated successfully, refreshing page');
            setEditingGuest(null);
            router.refresh();
        } else {
            showAlert('Error', 'Failed to update guest: ' + result.error);
        }
    };

    const handleDeleteGuest = async (guestId: string) => {
        console.log('Deleting guest from database:', guestId);

        const result = await deleteGuestFromLiveRound(guestId);

        if (result.success) {
            console.log('Guest deleted successfully, refreshing page');
            setIsGuestModalOpen(false);
            setEditingGuest(null);
            router.refresh();
        } else {
            showAlert('Error', 'Failed to delete guest: ' + result.error);
        }
    };

    const handleCopyToClub = async (selectedPlayerIds: string[]) => {
        if (!liveRoundId) {
            showAlert('Error', 'No live round selected');
            return;
        }

        const result = await copyLiveToClub({
            liveRoundId,
            playerIds: selectedPlayerIds
        });

        if (result.success) {
            showAlert('Success', result.message || 'Successfully copied to club scores!');
        } else {
            showAlert('Error', 'Failed to copy: ' + result.error);
        }
    };

    const movePlayerOrder = (index: number, direction: 'up' | 'down') => {
        const newSelected = [...selectedPlayers];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newSelected.length) {
            [newSelected[index], newSelected[targetIndex]] = [newSelected[targetIndex], newSelected[index]];
            setSelectedPlayers(newSelected);
            localStorage.setItem(`live_scoring_my_group_${liveRoundId}`, JSON.stringify(newSelected.map(p => p.id)));
        }
    };

    const handleAddPlayers = async (newSelectedPlayerIds: string[]) => {
        const allAvailable = [...allPlayers, ...guestPlayers];
        const combinedSelection = newSelectedPlayerIds.map(id =>
            allAvailable.find(p => p.id === id)
        ).filter((p): p is Player => p !== undefined);

        setSelectedPlayers(combinedSelection);

        const newSelectedPlayers = combinedSelection.filter(p => !p.isGuest && !p.id.startsWith('guest-'));

        // Check if a round is selected
        if (!liveRoundId) {
            showAlert('No Round Selected', 'Please create a new round or select an existing round before adding players.');
            return;
        }

        // 2. Add New Players to DB (or Claim existing ones)
        for (const player of newSelectedPlayers) {
            // Check if player is already in the Live Round (on server)
            const existingLrPlayer = initialRound?.players?.find((p: any) => p.player?.id === player.id);

            // We need to call the API if:
            // 1. Player is NOT in the round (Create)
            // 2. Player IS in the round, but scored by someone else (Claim) - unless we are Admin
            // Admin doesn't need to "claim" to score, but non-admins do.

            const needsToCreate = !existingLrPlayer;
            const needsToClaim = existingLrPlayer && existingLrPlayer.scorer_id !== clientScorerId && !isAdmin;

            if (needsToCreate || needsToClaim) {
                const teeBox = getPlayerTee(player);
                if (liveRoundId && teeBox?.id) {
                    console.log(needsToCreate ? "Creating player in round:" : "Claiming player from other device:", player.name);
                    await addPlayerToLiveRound({
                        liveRoundId: liveRoundId,
                        playerId: player.id,
                        teeBoxId: teeBox.id,
                        scorerId: isAdmin ? undefined : clientScorerId
                    });
                }
            }
        }

        // 3. Handle Removals (Explicit Drop)
        // Only remove players that were IN my previous selection and are NOT in the new selection.
        // Additionally, only remove if this device added them (scorer_id matches) or if admin
        const playersDropped = selectedPlayers.filter(p => !newSelectedPlayerIds.includes(p.id));

        if (liveRoundId && initialRound?.players) {
            const vetoedPlayers: Player[] = [];
            for (const player of playersDropped) {
                // Find the LiveRoundPlayer record
                const lrPlayer = initialRound.players.find((lr: any) =>
                    (lr.is_guest && lr.id === player.id) || (!lr.is_guest && lr.player?.id === player.id)
                );

                if (lrPlayer) {
                    // Relaxed removal: Any device that has the player selected can remove them
                    // This satisfies the user request: "any device that checked players can uncheck players and remove all trace"

                    const hasScores = lrPlayer.scores && lrPlayer.scores.length > 0;
                    console.log("Removing player from round:", lrPlayer.id, hasScores ? "(has scores)" : "(no scores)", "scorer_id:", lrPlayer.scorer_id, "client:", clientScorerId);

                    try {
                        const removeResult = await removePlayerFromLiveRound(lrPlayer.id);
                        if (removeResult.success) {
                            console.log("✓ Successfully removed player:", lrPlayer.id);
                        } else {
                            // Check for "Record to delete does not exist" (Prisma P2025) which counts as success
                            if (removeResult.error && (removeResult.error.includes('does not exist') || removeResult.error.includes('Record to delete'))) {
                                console.log("✓ Player already removed (concurrency):", lrPlayer.id);
                            } else {
                                console.error("✗ Failed to remove player:", lrPlayer.id, removeResult.error);
                                showAlert('Error', `Failed to remove player: ${removeResult.error || 'Unknown error'}`);
                                vetoedPlayers.push(player);
                            }
                        }
                    } catch (error) {
                        console.error("✗ Error removing player:", error);
                        // Only alert if it's not a "not found" error
                        const errorMsg = String(error);
                        if (!errorMsg.includes('does not exist') && !errorMsg.includes('Record to delete')) {
                            showAlert('Error', `Error removing player: ${error}`);
                            vetoedPlayers.push(player);
                        }
                    }
                }
            }

            // Restore any vetoed players to the selection state
            if (vetoedPlayers.length > 0) {
                setSelectedPlayers(prev => {
                    // Avoid duplicates
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueVetoed = vetoedPlayers.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueVetoed];
                });
            }

            // Refresh to update server-side round state
            router.refresh();
        }
    };

    const handleCreateNewRound = async () => {
        // ALWAYS treat "New" button as creating a FRESH round
        setRoundModalMode('new');

        // Lazy-load courses if not already loaded
        if (lazyLoadedCourses.length === 0 && !isLoadingCourses) {
            setIsLoadingCourses(true);
            try {
                const courses = await getAllCourses();
                setLazyLoadedCourses(courses);
            } catch (error) {
                console.error('Failed to load courses:', error);
            } finally {
                setIsLoadingCourses(false);
            }
        }

        setIsRoundModalOpen(true);
    };

    const updateScore = (playerId: string, increment: boolean) => {
        if (!liveRoundId) {
            console.warn("No live round ID available to save score.");
            return;
        }

        // Get current score from pending if exists, otherwise from saved scores
        const savedScore = scores.get(playerId)?.get(activeHole);
        const currentScore = pendingScores.get(playerId) ?? savedScore ?? activeHolePar;

        let nextScore = increment ? currentScore + 1 : currentScore - 1;
        if (nextScore < 1) nextScore = 1;

        // Update pending scores only (don't update main scores state)
        setPendingScores(prev => {
            const newPending = new Map(prev);
            newPending.set(playerId, nextScore);
            return newPending;
        });

        // Mark as unsaved
        setHasUnsavedChanges(true);
    };

    const handleAdminScoreChange = async (playerId: string, holeNumber: number, newValue: string) => {
        if (!liveRoundId) return;

        const numericValue = parseInt(newValue);
        if (isNaN(numericValue) || numericValue < 0) return;

        // 1. Optimistically update local state
        setScores(prev => {
            const next = new Map(prev);
            const playerScores = new Map(next.get(playerId) || new Map());
            playerScores.set(holeNumber, numericValue);
            next.set(playerId, playerScores);
            return next;
        });

        // 2. Save to server in background
        try {
            const result = await saveLiveScore({
                liveRoundId,
                holeNumber,
                playerScores: [{ playerId, strokes: numericValue }],
                scorerId: isAdmin ? undefined : clientScorerId
            });

            if (!result.success || result.partialFailure) {
                console.error("Save failed:", result.error);
                alert(`Failed to save score: ${result.error || 'Unknown error'}`);
                // Revert local state (optional, or just let the user see the alert)
                // For now, valid strategy is to keep the local state (it's backed up to localStorage) 
                // and let the user try hitting "Sync" later.
            }
        } catch (err) {
            console.error("Admin summary save failed:", err);
            alert("Network error saving score. Please check connection.");
        }
    };

    // Standardize Persistence logic: 
    // 1. Initial Load (via useState initializer at top)
    // 2. Auto-save on change
    useEffect(() => {
        if (typeof window !== 'undefined' && liveRoundId) { // Removed selectedPlayers.length > 0 check to allow clearing
            localStorage.setItem(`live_scoring_my_group_${liveRoundId}`, JSON.stringify(selectedPlayers.map(p => p.id)));
        }
    }, [selectedPlayers, liveRoundId]);

    // PERSIST SCORES locally to prevent data loss on refresh/network fail
    useEffect(() => {
        if (typeof window !== 'undefined' && liveRoundId && scores.size > 0) {
            try {
                // Read existing to prevent overwriting valid data with empty/partial state
                const existingRaw = localStorage.getItem(`live_scores_backup_${liveRoundId}`);
                let finalMap = new Map<string, Map<number, number>>();

                if (existingRaw) {
                    const parsed = JSON.parse(existingRaw);
                    parsed.forEach(([pid, arr]: any) => {
                        finalMap.set(pid, new Map(arr));
                    });
                }

                // Merge CURRENT state ON TOP of existing backup
                scores.forEach((pMap, pid) => {
                    const existingPMap = finalMap.get(pid) || new Map();
                    pMap.forEach((s, h) => {
                        existingPMap.set(h, s);
                    });
                    finalMap.set(pid, existingPMap);
                });

                const serializable = Array.from(finalMap.entries()).map(([pid, map]) => [pid, Array.from(map.entries())]);
                localStorage.setItem(`live_scores_backup_${liveRoundId}`, JSON.stringify(serializable));
            } catch (e) {
                console.error("Failed to backup scores", e);
            }
        }
    }, [scores, liveRoundId]);

    // SELF-HEALING SYNC: Ensure locally selected players are actually ON the server
    // DISABLED: This was causing removed players to be immediately re-added because local state
    // hadn't updated yet or due to race conditions. Trust the explicit add/remove actions.
    /*
    useEffect(() => {
        if (!liveRoundId || selectedPlayers.length === 0) return;

        const syncMissingPlayers = async () => {
            const missingFromServer = selectedPlayers.filter(p => {
                // Ignore guests (handled separately)
                if (p.isGuest) return false;

                // Check if player is in the server-provided initialRound
                const existsOnServer = initialRound?.players?.some((rp: any) => rp.player?.id === p.id);
                return !existsOnServer;
            });

            if (missingFromServer.length > 0) {
                console.log("Found players missing from server (Ghost Players). Attempting repair:", missingFromServer.map(p => p.name));

                let restoredCount = 0;
                for (const p of missingFromServer) {
                    const teeBox = getPlayerTee(p);
                    if (teeBox && liveRoundId) {
                        const res = await addPlayerToLiveRound({
                            liveRoundId,
                            playerId: p.id,
                            teeBoxId: teeBox.id
                        });
                        if (res.success) restoredCount++;
                    }
                }

                if (restoredCount > 0) {
                    console.log(`Repaired ${restoredCount} ghost players. Refreshing...`);
                    router.refresh();
                }
            }
        };

        // Debounce check to avoid spamming while initialRound loads
        const timer = setTimeout(syncMissingPlayers, 3000);
        return () => clearTimeout(timer);
    }, [selectedPlayers, initialRound, liveRoundId]);
    */

    // AUTO-UNSELECT ON OWNERSHIP LOSS:
    // If a player we have selected is now owned by someone else on the server, we lost the claim.
    // Unselect them locally to prevent "2 devices keeping score".
    useEffect(() => {
        if (!liveRoundId || !initialRound?.players || selectedPlayers.length === 0 || isAdmin) return;

        const lostPlayers = selectedPlayers.filter(p => {
            if (p.isGuest) return false;
            // Find the server record
            const lrPlayer = initialRound.players.find((rp: any) => rp.player?.id === p.id);
            // If exists, but scorer_id is NOT us (and not null), we lost it.
            if (lrPlayer && lrPlayer.scorer_id && lrPlayer.scorer_id !== clientScorerId) {
                return true;
            }
            return false;
        });

        if (lostPlayers.length > 0) {
            console.log("Ownership lost for players (Stolen by another device):", lostPlayers.map(p => p.name));
            // Remove them from local selection
            setSelectedPlayers(prev => prev.filter(p => !lostPlayers.some(lp => lp.id === p.id)));
            // Optional: User feedback
            // alert(`The following players were claimed by another device: ${lostPlayers.map(p => p.name).join(', ')}`);
        }
    }, [initialRound, selectedPlayers, clientScorerId, isAdmin, liveRoundId]);
    // AUTO-SELECT CURRENT USER:
    // If no players are selected for scoring locally, but the current user is a participant 
    // in the round, auto-select them.
    // This ensures a "Ready to Score" state immediately after creating or joining a round.
    useEffect(() => {
        if (!liveRoundId || !currentUserId || selectedPlayers.length > 0 || isAdmin || !initialRound?.players) return;

        // Check if current user is in the round participants
        const meOnServer = initialRound.players.find((p: any) => p.player?.id === currentUserId);

        if (meOnServer) {
            const meAsPlayer: Player = {
                id: meOnServer.player.id,
                name: meOnServer.player.name,
                index: meOnServer.player.index,
                preferred_tee_box: meOnServer.player.preferred_tee_box,
                liveRoundPlayerId: meOnServer.id,
                scorerId: meOnServer.scorer_id,
                liveRoundData: {
                    tee_box_name: meOnServer.tee_box_name,
                    course_hcp: meOnServer.course_handicap
                }
            };

            console.log("Auto-selecting current user for scoring:", meAsPlayer.name);
            setSelectedPlayers([meAsPlayer]);
        }
    }, [initialRound, currentUserId, selectedPlayers.length, isAdmin, liveRoundId]);

    // Ensure all relevant sections are visible when switching rounds or starting new ones
    useEffect(() => {
        if (liveRoundId) {
            setShowDetails(true);
        }
    }, [liveRoundId]);
    const summaryPlayers = useMemo(() => {
        // Calculate Summary Players (Union of Server State and Local Selection)
        // Create map from initialRound if available
        const summaryPlayersMap = new Map<string, Player>();
        if (initialRound?.players) {
            initialRound.players.forEach((p: any) => {
                if (p.is_guest) {
                    // Handle guest players
                    summaryPlayersMap.set(p.id, {
                        id: p.id,
                        name: p.guest_name || 'Guest',
                        index: p.index_at_time,
                        preferred_tee_box: null,
                        isGuest: true,
                        liveRoundPlayerId: p.id, // For guests, the ID is already the LiveRoundPlayer ID
                        scorerId: p.scorer_id, // Store the scorer ID
                        liveRoundData: {
                            tee_box_name: p.tee_box_name,
                            course_hcp: p.course_handicap
                        }
                    });
                } else if (p.player) {
                    // Handle regular players
                    summaryPlayersMap.set(p.player.id, {
                        id: p.player.id,
                        name: p.player.name,
                        index: p.player.index,
                        preferred_tee_box: p.player.preferred_tee_box,
                        liveRoundPlayerId: p.id, // Store the LiveRoundPlayer ID
                        scorerId: p.scorer_id, // Store the scorer ID
                        liveRoundData: {
                            tee_box_name: p.tee_box_name,
                            course_hcp: p.course_handicap
                        }
                    });
                }
            });
        }
        // Add any locally selected players
        selectedPlayers.forEach(p => {
            if (!summaryPlayersMap.has(p.id)) summaryPlayersMap.set(p.id, p);
        });

        // For admins: show all players in the round (from server)
        // For non-admins: show all players selected by any device
        return Array.from(summaryPlayersMap.values());
    }, [initialRound, selectedPlayers]);

    // Admin should always see ALL players in the round for scoring/management
    // Non-admins see their locally selected group for SCORING only
    const effectiveScoringPlayers = isAdmin
        ? summaryPlayers
        : (selectedPlayers.length > 0 ? selectedPlayers : []);

    // Check if all scoring players have completed 18 holes
    const allScoringPlayersFinished = effectiveScoringPlayers.length > 0 && effectiveScoringPlayers.every(player => {
        const playerScores = scores.get(player.id);
        if (!playerScores) return false;
        // Check if player has scores for all 18 holes
        for (let hole = 1; hole <= 18; hole++) {
            if (!playerScores.has(hole)) return false;
        }
        return true;
    });

    // Calculate Leaderboard Data - ALL devices see ALL players
    const rankedPlayers = useMemo(() => {
        return summaryPlayers.map(player => {
            const playerScores = scores.get(player.id);
            let totalGross = 0;
            let front9 = 0;
            let back9 = 0;
            let strokesReceivedSoFar = 0;
            let parTotal = 0;
            let thru = 0;
            const courseHcp = getCourseHandicap(player);

            const grossHoleScores: { difficulty: number; grossScore: number }[] = [];

            if (playerScores) {
                playerScores.forEach((strokes, holeNum) => {
                    totalGross += strokes;

                    // Track front 9 and back 9
                    if (holeNum <= 9) {
                        front9 += strokes;
                    } else {
                        back9 += strokes;
                    }

                    const hole = defaultCourse?.holes.find(h => h.holeNumber === holeNum);
                    const holePar = hole?.par || 4;
                    const difficulty = hole?.difficulty || holeNum;

                    // Collect for tie breaker
                    grossHoleScores.push({
                        difficulty,
                        grossScore: strokes
                    });

                    let holeStrokes = 0;
                    if (courseHcp > 0) {
                        const base = Math.floor(courseHcp / 18);
                        const remainder = courseHcp % 18;
                        holeStrokes = base + (difficulty <= remainder ? 1 : 0);
                    }
                    strokesReceivedSoFar += holeStrokes;

                    parTotal += holePar;
                    thru++;
                });
            }

            // Sort gross scores by difficulty (1 is hardest) for tie-breaker
            grossHoleScores.sort((a, b) => a.difficulty - b.difficulty);

            const totalNet = totalGross - (strokesReceivedSoFar || 0);
            const toPar = totalGross - parTotal;

            return { ...player, totalGross, front9, back9, strokesReceivedSoFar, courseHcp, totalNet, thru, toPar, parTotal, grossHoleScores };
        }).sort((a, b) => {
            // Primary Sort: Total Net (Ascending)
            if (a.totalNet !== b.totalNet) return a.totalNet - b.totalNet;

            // Tie Breaker: Compare Gross Score on hardest holes (Difficulty 1, 2, 3...)
            const len = Math.min(a.grossHoleScores.length, b.grossHoleScores.length);
            for (let i = 0; i < len; i++) {
                if (a.grossHoleScores[i].grossScore !== b.grossHoleScores[i].grossScore) {
                    return a.grossHoleScores[i].grossScore - b.grossHoleScores[i].grossScore;
                }
            }

            return 0;
        });
    }, [summaryPlayers, scores, defaultCourse]);

    const activePlayers = rankedPlayers.filter(p => p.thru > 0);
    const allActiveFinished = activePlayers.length > 0 && activePlayers.every(p => p.thru >= 18);
    const allPlayersFinished = rankedPlayers.length > 0 && rankedPlayers.every(p => p.thru >= 18);




    // Calculate Stats (Birdies/Eagles) for Modal
    const playerStats = rankedPlayers.map(player => {
        const playerScores = scores.get(player.id);
        let birdieCount = 0;
        let eagleCount = 0;

        if (playerScores) {
            playerScores.forEach((strokes, holeNum) => {
                const hole = defaultCourse?.holes.find(h => h.holeNumber === holeNum);
                const holePar = hole?.par || 4;
                const diff = strokes - holePar;
                if (diff === -1) birdieCount++;
                if (diff <= -2) eagleCount++;
            });
        }
        return { ...player, birdieCount, eagleCount };
    });

    const birdieLeaders = playerStats.filter(p => p.birdieCount > 0).sort((a, b) => b.birdieCount - a.birdieCount);
    const eagleLeaders = playerStats.filter(p => p.eagleCount > 0).sort((a, b) => b.eagleCount - a.eagleCount);

    const isToday = initialRound?.date === todayStr;


    return (
        <div className="min-h-screen bg-gray-50 pb-1 text-zinc-900">


            <main className="max-w-xl mx-auto px-1 pt-1 space-y-1">
                {/* Round Selector - Visibility Controlled by 'Details' toggle */}
                {showDetails && (
                    <div className="bg-white rounded-xl p-1 border border-zinc-200 shadow-xl flex flex-col justify-center space-y-1">
                        <div className="flex justify-between items-center">
                            <label htmlFor="round-selector" className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Select Round</label>
                            <div className="flex gap-1">
                                {/* Transfer button - Admin only */}
                                {liveRoundId && isAdmin && (
                                    <button
                                        onClick={() => setIsAddToClubModalOpen(true)}
                                        className="bg-green-600 text-white text-[15pt] font-bold px-1 py-1 rounded-xl hover:bg-green-700 transition-all shadow-md active:scale-95"
                                    >
                                        Transfer
                                    </button>
                                )}
                                {/* Delete button - admin only (for current round) */}
                                {isAdmin && liveRoundId && (
                                    <button
                                        onClick={() => {
                                            if (!liveRoundId) return;
                                            setConfirmConfig({
                                                isOpen: true,
                                                title: 'Delete Live Round',
                                                message: 'Are you sure you want to delete this live round? This action cannot be undone.',
                                                isDestructive: true,
                                                onConfirm: async () => {
                                                    setConfirmConfig(null);
                                                    try {
                                                        console.log("Attempting to delete round:", liveRoundId);
                                                        const result = await deleteLiveRound(liveRoundId);
                                                        console.log("Delete result:", result);

                                                        if (result.success) {
                                                            // Force hard reload to clear state and show updated list
                                                            window.location.href = '/live';
                                                        } else {
                                                            console.error("Delete failed on server:", result.error);
                                                            showAlert('Error', 'Failed to delete: ' + result.error);
                                                        }
                                                    } catch (err) {
                                                        console.error('Failed to delete round (client error):', err);
                                                        showAlert('Error', 'Failed to delete round (network/client error).');
                                                    }
                                                }
                                            });
                                        }}
                                        className="bg-red-600 text-white text-xs font-black p-1 rounded-xl hover:bg-red-700 transition-all shadow-md active:scale-95 uppercase tracking-widest"
                                    >
                                        Delete
                                    </button>
                                )}
                                {/* Delete button - for all users (to delete current round) */}
                                {!isAdmin && liveRoundId && (
                                    <button
                                        onClick={() => {
                                            const currentRound = allLiveRounds.find(r => r.id === liveRoundId);
                                            if (!currentRound) return;

                                            setConfirmConfig({
                                                isOpen: true,
                                                title: 'Delete Round',
                                                message: `Are you sure you want to delete "${currentRound.name}"? This action cannot be undone.`,
                                                isDestructive: true,
                                                onConfirm: async () => {
                                                    setConfirmConfig(null);
                                                    try {
                                                        const result = await deleteUserLiveRound(liveRoundId);
                                                        if (result.success) {
                                                            window.location.href = '/live';
                                                        } else {
                                                            showAlert('Error', result.error || 'Failed to delete round');
                                                        }
                                                    } catch (err) {
                                                        console.error('Failed to delete round:', err);
                                                        showAlert('Error', 'Failed to delete round');
                                                    }
                                                }
                                            });
                                        }}
                                        className="bg-red-600 text-white text-xs font-black p-1 rounded-xl hover:bg-red-700 transition-all shadow-md active:scale-95 uppercase tracking-widest"
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    onClick={handleCreateNewRound}
                                    className="p-1 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-md active:scale-95 uppercase tracking-widest"
                                >
                                    New
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsRoundDropdownOpen(!isRoundDropdownOpen)}
                                className="w-full px-1 py-1 mt-1 text-[17pt] bg-black text-white rounded-xl font-bold flex justify-between items-center transition-all active:scale-[0.99] border border-black"
                                title="Select Round"
                            >
                                <span className="truncate">
                                    {(() => {
                                        const r = allLiveRounds.find(r => r.id === liveRoundId);
                                        if (!r) return "-- Select a Round --";
                                        return r.name;
                                    })()}
                                </span>
                                <span className="text-xs ml-1">▼</span>
                            </button>

                            {isRoundDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40 bg-transparent"
                                        onClick={() => setIsRoundDropdownOpen(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-black text-white rounded-xl border border-zinc-800 shadow-2xl z-50 overflow-y-auto max-h-[300px] py-1">
                                        {allLiveRounds.map((round) => {
                                            const isSelected = round.id === liveRoundId;

                                            return (
                                                <button
                                                    key={round.id}
                                                    onClick={() => {
                                                        setIsRoundDropdownOpen(false);
                                                        window.location.href = `/live?roundId=${round.id}`;
                                                    }}
                                                    className={`w-full text-left px-2 py-2 text-[17pt] transition-colors border-b border-zinc-900 last:border-0 ${isSelected ? 'bg-zinc-800 text-white font-black' : 'text-white/50 hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span>{round.name}</span>
                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}


                {/* Course Info Card */}
                {showDetails && isToday && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl p-1 border border-zinc-200 shadow-xl">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-1">
                                    <h2 className="text-2xl font-black text-zinc-900 tracking-tighter italic uppercase">{(defaultCourse?.name || 'Round').replace(/New Orleans/gi, '').trim()}</h2>
                                </div>
                                <div className="flex flex-nowrap gap-x-1 text-[15pt] text-gray-500 mt-1 overflow-x-auto">
                                    <span className="whitespace-nowrap">P:{initialRound?.par ?? defaultCourse?.holes?.reduce((a, b) => a + b.par, 0)}</span>
                                    <span className="whitespace-nowrap">R:{initialRound?.rating ?? defaultCourse?.teeBoxes?.[0]?.rating}</span>
                                    <span className="whitespace-nowrap">S:{initialRound?.slope ?? defaultCourse?.teeBoxes?.[0]?.slope}</span>
                                    {(() => {
                                        // Find the tee box name based on rating and slope
                                        const teeBox = defaultCourse?.teeBoxes?.find(t =>
                                            t.rating === (initialRound?.rating ?? defaultCourse?.teeBoxes?.[0]?.rating) &&
                                            t.slope === (initialRound?.slope ?? defaultCourse?.teeBoxes?.[0]?.slope)
                                        );
                                        const teeName = teeBox?.name || '';
                                        const teeIndicator = teeName.toLowerCase().includes('white') ? 'W'
                                            : teeName.toLowerCase().includes('gold') ? 'G'
                                                : teeName.charAt(0).toUpperCase();
                                        return teeIndicator && <span className="px-1 py-0.5 rounded text-[14pt] font-bold bg-white text-black border border-black whitespace-nowrap">{teeIndicator}</span>;
                                    })()}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">

                                {true && ( // Always show these buttons for navigation
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => setIsPlayerModalOpen(true)}
                                            className="bg-black text-white border border-black text-xs font-black px-1 py-1 rounded-xl hover:bg-zinc-800 transition-all shadow-md active:scale-95 uppercase tracking-widest"
                                        >
                                            Players
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setRoundModalMode('edit');
                                                // Lazy-load courses if not already loaded
                                                if (lazyLoadedCourses.length === 0 && !isLoadingCourses) {
                                                    setIsLoadingCourses(true);
                                                    try {
                                                        const courses = await getAllCourses();
                                                        setLazyLoadedCourses(courses);
                                                    } catch (error) {
                                                        console.error('Failed to load courses:', error);
                                                    } finally {
                                                        setIsLoadingCourses(false);
                                                    }
                                                }
                                                setIsRoundModalOpen(true);
                                            }}
                                            className="bg-black text-white border border-black text-xs font-black px-1 py-1 rounded-xl hover:bg-zinc-800 transition-all shadow-md active:scale-95 uppercase tracking-widest"
                                        >
                                            Course
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )
                }

                <LiveRoundModal
                    isOpen={isRoundModalOpen}
                    onClose={() => setIsRoundModalOpen(false)}
                    courseId={lastUsedCourseId || defaultCourse?.id || undefined}
                    defaultTeeBoxId={lastUsedTeeBoxId || undefined}
                    existingRound={roundModalMode === 'edit' ? initialRound : null}
                    allCourses={lazyLoadedCourses.length > 0 ? lazyLoadedCourses : allCourses}
                    showAlert={showAlert}
                    currentUserId={currentUserId}
                />

                {/* Player Selection Modal */}
                <LivePlayerSelectionModal
                    isOpen={isPlayerModalOpen}
                    onClose={() => setIsPlayerModalOpen(false)}
                    allPlayers={[...allPlayers, ...guestPlayers]}
                    selectedIds={selectedPlayers.map(p => p.id)}
                    playersInRound={initialRound?.players?.map((p: any) => p.player?.id).filter((id: any) => !!id) || []}
                    onSelectionChange={handleAddPlayers}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    courseData={defaultCourse ? {
                        courseName: defaultCourse.name.replace(/New Orleans/gi, '').trim(),
                        teeBoxes: defaultCourse.teeBoxes,
                        par: defaultCourse.holes.reduce((sum, h) => sum + h.par, 0),
                        roundTeeBox: initialRound ? {
                            rating: initialRound.rating,
                            slope: initialRound.slope
                        } : null
                    } : null}

                />

                <GuestPlayerModal
                    isOpen={isGuestModalOpen}
                    onClose={() => {
                        setIsGuestModalOpen(false);
                        setEditingGuest(null);
                    }}
                    onAdd={handleAddGuest}
                    onUpdate={handleUpdateGuest}
                    onDelete={handleDeleteGuest}
                    editingGuest={editingGuest}
                    roundData={initialRound ? {
                        rating: initialRound.rating,
                        slope: initialRound.slope,
                        par: initialRound.par
                    } : null}
                />

                {/* Scoring Section */}
                {/* GPS SECTION */}
                {
                    initialRound && isToday && (
                        <div className="bg-white/80 backdrop-blur-xl rounded-xl p-1 border border-zinc-200 shadow-xl space-y-1">
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setIsGPSEnabled(!isGPSEnabled)}
                                        className={`px-1 py-1 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 uppercase tracking-widest ${isGPSEnabled
                                            ? 'bg-green-600 text-white animate-pulse'
                                            : 'bg-blue-600 text-white'
                                            }`}
                                    >
                                        GPS {isGPSEnabled ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="px-1 py-1 bg-black text-white rounded-xl text-xs font-black transition-all hover:bg-zinc-800 uppercase tracking-widest shadow-md"
                                >
                                    Details
                                </button>
                            </div>

                            {isGPSEnabled && (
                                <div className="min-h-[140px] flex flex-col justify-center">
                                    {/* GPS Distance Display */}
                                    {(() => {
                                        const currentHole = defaultCourse?.holes.find(h => h.holeNumber === activeHole);

                                        if (!userLocation) {
                                            return (
                                                <div className="bg-gray-100 text-gray-500 p-1 rounded-full border-2 border-dashed border-gray-300 text-center mb-1 shadow-inner">
                                                    <p className="font-medium text-[17pt] animate-pulse py-1">🛰️ Waiting for GPS...</p>
                                                </div>
                                            );
                                        }

                                        if (!currentHole?.latitude || !currentHole?.longitude) {
                                            return (
                                                <div className="bg-yellow-50 text-yellow-700 p-1 rounded-full text-center mb-1 shadow-inner border-2 border-yellow-400">
                                                    <p className="font-medium text-[17pt] py-1">📍 Coordinates missing for Hole {activeHole}</p>
                                                </div>
                                            );
                                        }

                                        const dist = calculateDistance(
                                            userLocation.latitude,
                                            userLocation.longitude,
                                            Number(currentHole.latitude),
                                            Number(currentHole.longitude)
                                        );

                                        const getElement = (side: string, num: number) =>
                                            currentHole.elements?.find(e => e.side === side && e.elementNumber === num);

                                        const renderElement = (side: 'LEFT' | 'RIGHT', num: number, positionClass: string) => {
                                            const el = getElement(side, num);
                                            if (!el) return null;

                                            const distFront = (el.frontLatitude && el.frontLongitude) ? calculateDistance(userLocation.latitude, userLocation.longitude, Number(el.frontLatitude), Number(el.frontLongitude)) : null;
                                            const distBack = (el.backLatitude && el.backLongitude) ? calculateDistance(userLocation.latitude, userLocation.longitude, Number(el.backLatitude), Number(el.backLongitude)) : null;

                                            if (!distFront && !distBack && !el.water && !el.bunker && !el.tree) return null;

                                            const Icons = (
                                                <div className="flex gap-0.5">
                                                    {el.water && <span>💧</span>}
                                                    {el.bunker && <div className="w-7 h-7 bg-[#d2b48c] border border-black/20 rounded-full" />}
                                                    {el.tree && <span>🌳</span>}
                                                </div>
                                            );

                                            const Numbers = (
                                                <div className={`flex flex-col ${side === 'LEFT' ? 'items-end' : 'items-start'} leading-none`}>
                                                    <span className={distBack === null ? 'invisible' : ''}>{distBack ?? '--'}</span>
                                                    <span className={distFront === null ? 'invisible' : ''}>{distFront ?? '--'}</span>
                                                </div>
                                            );

                                            return (
                                                <div className={`absolute ${positionClass} flex items-center gap-1 text-white text-[21pt] font-extrabold z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`}>
                                                    {side === 'LEFT' ? (
                                                        <>
                                                            {Numbers}
                                                            {Icons}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {Icons}
                                                            {Numbers}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        };

                                        return (
                                            <div className="bg-green-600 text-white w-full mx-auto p-1 rounded-xl text-center mb-1 border-2 border-black shadow-inner relative overflow-hidden">
                                                {/* Left Elements */}
                                                {renderElement('LEFT', 2, 'top-1 left-1')}
                                                {renderElement('LEFT', 1, 'bottom-1 left-1')}

                                                {/* Right Elements */}
                                                {renderElement('RIGHT', 2, 'top-1 right-1')}
                                                {renderElement('RIGHT', 1, 'bottom-1 right-1')}

                                                <p className="font-black text-[78pt] leading-none flex items-center justify-center pt-1 pb-1">
                                                    {dist || (dist === 0 ? '0' : '--')}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="grid grid-cols-6 gap-1">
                                {defaultCourse?.holes.map(hole => {
                                    // Use selected group if available, otherwise check all players in the round
                                    const playersForStatus = selectedPlayers.length > 0 ? selectedPlayers : rankedPlayers;

                                    const isSaved = playersForStatus.some(p => {
                                        const pScores = scores.get(p.id);
                                        return pScores && pScores.has(hole.holeNumber);
                                    });

                                    const isActive = activeHole === hole.holeNumber;
                                    const isMissing = playersForStatus.length > 0 && !isActive && !isSaved && hole.holeNumber < activeHole;

                                    // Determine styling
                                    let btnClass = "bg-white text-zinc-400 border border-zinc-200 shadow-sm";
                                    if (isActive) {
                                        // Active hole: vibrant green
                                        btnClass = "bg-green-600 text-white border-transparent shadow-lg scale-105 z-10";
                                    } else if (isMissing) {
                                        // Missing scores: muted red
                                        btnClass = "bg-red-50 text-red-600 border-red-200";
                                    } else if (isSaved) {
                                        // Completed: soft light background
                                        btnClass = "bg-zinc-100 text-zinc-900 border-transparent shadow-inner";
                                    }

                                    return (
                                        <button
                                            key={hole.holeNumber}
                                            onClick={() => {
                                                if (hasUnsavedChanges && pendingScores.size > 0) {
                                                    // Simple block to prevent data loss
                                                    alert("Unsaved Scores! Please click 'SAVE HOLE " + activeHole + "' before changing holes.");
                                                    return;
                                                }
                                                setActiveHole(hole.holeNumber);
                                            }}
                                            className={`
                                            flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-300 active:scale-90
                                            ${btnClass}
                                        `}
                                            title={`Hole ${hole.holeNumber}`}
                                        >
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-xl font-black italic tracking-tighter leading-none">{hole.holeNumber}</span>
                                                <span className="text-xs font-bold leading-none opacity-60">/{hole.par}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }
                {/* PLAYERS SECTION (Scoring) */}
                {
                    isToday && (
                        <div id="scoring-section" className="bg-white/80 backdrop-blur-xl rounded-xl p-1 border border-zinc-200 shadow-xl space-y-1">
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-zinc-900 italic uppercase tracking-tighter">Players ({effectiveScoringPlayers.length})</h2>

                                </div>
                                {
                                    effectiveScoringPlayers.length > 0 && (
                                        <button
                                            onClick={async () => {
                                                if (!liveRoundId || isSaving) return;

                                                // Prevent double clicks
                                                setIsSaving(true);

                                                try {
                                                    // Capture current state values for async operation
                                                    const currentHole = activeHole;
                                                    const updates: { playerId: string; strokes: number }[] = [];
                                                    const newScores = new Map(scores);

                                                    // Check if anyone scored a birdie on this hole
                                                    const birdiePlayerData: Array<{ name: string; totalBirdies: number }> = [];
                                                    const eaglePlayerData: Array<{ name: string; totalEagles: number }> = [];
                                                    const activeHolePar = defaultCourse?.holes.find(h => h.holeNumber === currentHole)?.par || 4;

                                                    effectiveScoringPlayers.forEach(p => {
                                                        const playerScores = new Map(newScores.get(p.id) || []);

                                                        // Use pending score if it exists, otherwise use saved score or par
                                                        const pendingScore = pendingScores.get(p.id);
                                                        const savedScore = playerScores.get(currentHole);
                                                        const finalScore = pendingScore ?? savedScore ?? activeHolePar;

                                                        // Update the score in the map
                                                        playerScores.set(currentHole, finalScore);
                                                        newScores.set(p.id, playerScores);

                                                        // Add to updates for server
                                                        updates.push({ playerId: p.id, strokes: finalScore });

                                                        // Check if this hole is a birdie
                                                        if (finalScore === activeHolePar - 1) {
                                                            if (!knownBirdiesRef.current.has(p.id)) {
                                                                knownBirdiesRef.current.set(p.id, new Set());
                                                            }

                                                            const wasKnown = knownBirdiesRef.current.get(p.id)!.has(currentHole);
                                                            knownBirdiesRef.current.get(p.id)!.add(currentHole);

                                                            if (!wasKnown) {
                                                                let totalBirdies = 0;
                                                                playerScores.forEach((strokes, holeNum) => {
                                                                    const hole = defaultCourse?.holes.find(h => h.holeNumber === holeNum);
                                                                    const holePar = hole?.par || 4;
                                                                    if (strokes === holePar - 1) {
                                                                        totalBirdies++;
                                                                    }
                                                                });
                                                                birdiePlayerData.push({ name: p.name, totalBirdies });
                                                            }
                                                        }

                                                        // Check if this hole is an eagle (or better)
                                                        if (finalScore <= activeHolePar - 2) {
                                                            if (!knownEaglesRef.current.has(p.id)) {
                                                                knownEaglesRef.current.set(p.id, new Set());
                                                            }

                                                            const wasKnown = knownEaglesRef.current.get(p.id)!.has(currentHole);
                                                            knownEaglesRef.current.get(p.id)!.add(currentHole);

                                                            if (!wasKnown) {
                                                                let totalEagles = 0;
                                                                playerScores.forEach((strokes, holeNum) => {
                                                                    const hole = defaultCourse?.holes.find(h => h.holeNumber === holeNum);
                                                                    const holePar = hole?.par || 4;
                                                                    if (strokes <= holePar - 2) {
                                                                        totalEagles++;
                                                                    }
                                                                });
                                                                eaglePlayerData.push({ name: p.name, totalEagles });
                                                            }
                                                        }
                                                    });

                                                    // 1. UPDATE LOCAL STATE IMMEDIATELY (Optimistic)
                                                    setScores(newScores);

                                                    // Show celebration if there's a birdie or eagle on this hole
                                                    if (birdiePlayerData.length > 0) {
                                                        setBirdiePlayers(birdiePlayerData);
                                                    }
                                                    if (eaglePlayerData.length > 0) {
                                                        setEaglePlayers(eaglePlayerData);
                                                    }

                                                    // Clear pending scores and reset unsaved flag
                                                    setPendingScores(new Map());
                                                    setHasUnsavedChanges(false);

                                                    // 2. SAVE TO SERVER with RETRY (try once, retry once if failed)
                                                    if (updates.length > 0) {
                                                        let saveSuccess = false;

                                                        // First attempt
                                                        try {
                                                            const result = await saveLiveScore({
                                                                liveRoundId,
                                                                holeNumber: currentHole,
                                                                playerScores: updates,
                                                                scorerId: clientScorerId
                                                            });

                                                            if (result.success && !result.partialFailure) {
                                                                saveSuccess = true;
                                                                // Remove from unsaved holes if it was there
                                                                setUnsavedToDbHoles(prev => {
                                                                    const next = new Map(prev);
                                                                    next.delete(currentHole);
                                                                    return next;
                                                                });
                                                            }
                                                        } catch (err) {
                                                            console.error("First save attempt failed:", err);
                                                        }

                                                        // Retry once if first attempt failed
                                                        if (!saveSuccess) {
                                                            console.log(`Retrying save for hole ${currentHole}...`);
                                                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

                                                            try {
                                                                const retryResult = await saveLiveScore({
                                                                    liveRoundId,
                                                                    holeNumber: currentHole,
                                                                    playerScores: updates,
                                                                    scorerId: clientScorerId
                                                                });

                                                                if (retryResult.success && !retryResult.partialFailure) {
                                                                    saveSuccess = true;
                                                                    // Remove from unsaved holes if it was there
                                                                    setUnsavedToDbHoles(prev => {
                                                                        const next = new Map(prev);
                                                                        next.delete(currentHole);
                                                                        return next;
                                                                    });
                                                                }
                                                            } catch (err) {
                                                                console.error("Retry save attempt failed:", err);
                                                            }
                                                        }

                                                        // If still failed, flag hole as unsaved
                                                        if (!saveSuccess) {
                                                            console.warn(`Hole ${currentHole} could not be saved to database. Flagging for later retry.`);
                                                            setUnsavedToDbHoles(prev => {
                                                                const next = new Map(prev);
                                                                next.set(currentHole, updates);
                                                                return next;
                                                            });
                                                        }
                                                    }

                                                    // 3. Determine next hole after successful save
                                                    let nextHoleToSet = (currentHole % 18) + 1;
                                                    let allHolesComplete = true;

                                                    for (let i = 1; i <= 18; i++) {
                                                        const checkHole = ((currentHole + i - 1) % 18) + 1;
                                                        const isIncomplete = effectiveScoringPlayers.some(p => {
                                                            const pScores = newScores.get(p.id);
                                                            return !pScores || !pScores.has(checkHole);
                                                        });

                                                        if (isIncomplete) {
                                                            nextHoleToSet = checkHole;
                                                            allHolesComplete = false;
                                                            break;
                                                        }
                                                    }

                                                    // 4. If all 18 holes complete and there are unsaved holes, retry saving them
                                                    if (allHolesComplete && unsavedToDbHoles.size > 0) {
                                                        console.log(`Round complete! Retrying ${unsavedToDbHoles.size} unsaved holes...`);

                                                        const stillFailedHoles: number[] = [];

                                                        for (const [holeNum, playerScores] of unsavedToDbHoles.entries()) {
                                                            try {
                                                                const finalResult = await saveLiveScore({
                                                                    liveRoundId,
                                                                    holeNumber: holeNum,
                                                                    playerScores: playerScores,
                                                                    scorerId: clientScorerId
                                                                });

                                                                if (!finalResult.success || finalResult.partialFailure) {
                                                                    stillFailedHoles.push(holeNum);
                                                                }
                                                            } catch (err) {
                                                                console.error(`Final retry for hole ${holeNum} failed:`, err);
                                                                stillFailedHoles.push(holeNum);
                                                            }
                                                        }

                                                        // Clear the unsaved holes that succeeded
                                                        setUnsavedToDbHoles(prev => {
                                                            const next = new Map(prev);
                                                            for (const [holeNum] of prev.entries()) {
                                                                if (!stillFailedHoles.includes(holeNum)) {
                                                                    next.delete(holeNum);
                                                                }
                                                            }
                                                            return next;
                                                        });

                                                        // If still have failed holes, WARN user to take screenshot
                                                        if (stillFailedHoles.length > 0) {
                                                            showAlert(
                                                                '⚠️ WARNING: Scores Not Saved',
                                                                `Holes ${stillFailedHoles.join(', ')} could NOT be saved to the database after multiple attempts.\n\n` +
                                                                `🔴 IMPORTANT: Please take a SCREENSHOT of your scorecard NOW to preserve your scores!\n\n` +
                                                                `Your scores are saved locally on this device, but may be lost if you clear browser data.`
                                                            );
                                                        } else {
                                                            console.log('All holes successfully saved to database!');
                                                        }
                                                    }

                                                    // 5. UI UPDATE after successful save
                                                    setActiveHole(nextHoleToSet);
                                                    setShowDetails(false);
                                                } catch (error) {
                                                    console.error("Save error:", error);
                                                    showAlert('Error', "Network error saving scores. Data is saved locally.");
                                                } finally {
                                                    setIsSaving(false);
                                                }
                                            }}
                                            disabled={isSaving}
                                            className={`${(() => {
                                                // Check if this hole has been scored for all selected players
                                                const isHoleScored = effectiveScoringPlayers.every(p => {
                                                    const playerScores = scores.get(p.id);
                                                    return playerScores && playerScores.has(activeHole);
                                                });
                                                // Blue if: has unsaved changes OR hole is not yet scored
                                                // Black if: hole is scored AND no unsaved changes
                                                return (hasUnsavedChanges || !isHoleScored) ? 'bg-green-600 text-white shadow-lg' : 'bg-zinc-100 text-zinc-500';
                                            })()} ml-auto italic uppercase tracking-tighter text-lg font-black p-1 rounded-xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50`}
                                            title={`Save Hole: ${activeHole}`}
                                        >
                                            <div className="relative">
                                                <span className={isSaving ? 'invisible' : 'visible'}>
                                                    Save Hole: {activeHole}
                                                </span>
                                                {isSaving && (
                                                    <span className="absolute inset-0 flex items-center justify-center">
                                                        Updating...
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                }
                            </div>
                            <div className="space-y-1">
                                {[...effectiveScoringPlayers]
                                    .map((player, index) => {
                                        const score = getScore(player.id, activeHole);
                                        // Calculate Totals for To Par
                                        const pScores = scores.get(player.id);
                                        let totalScore = 0;
                                        let totalScoredPar = 0;
                                        if (pScores) {
                                            pScores.forEach((strokes, hNum) => {
                                                totalScore += strokes;
                                                const hPar = defaultCourse?.holes.find(h => h.holeNumber === hNum)?.par || 4;
                                                totalScoredPar += hPar;
                                            });
                                        }
                                        const diff = totalScore - totalScoredPar;
                                        let toParStr = "E";
                                        let toParClass = "text-green-400";
                                        if (diff > 0) {
                                            toParStr = `+${diff}`;
                                            toParClass = "text-zinc-500";
                                        } else if (diff < 0) {
                                            toParStr = `${diff}`;
                                            toParClass = "text-red-400";
                                        }

                                        const courseHcp = getCourseHandicap(player);

                                        const playerRankIndex = rankedPlayers.findIndex(rp => rp.id === player.id);
                                        let displayRank: React.ReactNode = playerRankIndex !== -1 ? playerRankIndex + 1 : '-';
                                        let showFlagNextToName = false;
                                        let showRankIconNextToName: React.ReactNode = null;

                                        if (playerRankIndex !== -1 && rankedPlayers[playerRankIndex].thru >= 18) {
                                            if (allActiveFinished) {
                                                if (playerRankIndex === 0) {
                                                    displayRank = "🏆";
                                                    showRankIconNextToName = "🏆";
                                                } else if (playerRankIndex === 1) {
                                                    displayRank = "🥈";
                                                    showRankIconNextToName = "🥈";
                                                } else if (playerRankIndex === 2) {
                                                    displayRank = "🥉";
                                                    showRankIconNextToName = "🥉";
                                                } else {
                                                    showFlagNextToName = true;
                                                }
                                            } else {
                                                showFlagNextToName = true;
                                            }
                                        }

                                        return (
                                            <div key={player.id} className="bg-white border border-zinc-100 rounded-xl p-1 flex justify-between items-center group transition-all hover:bg-zinc-50 shadow-sm">
                                                <div className="flex items-center gap-1">
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <div className="flex items-center gap-1">
                                                            <div className="font-black text-zinc-900 text-xl italic uppercase tracking-tighter">{splitName(player.name).first}</div>
                                                            {(() => {
                                                                const tee = getPlayerTee(player);
                                                                if (!tee) return null;
                                                                const letter = tee.name.toLowerCase().includes('white') ? 'W'
                                                                    : tee.name.toLowerCase().includes('gold') ? 'G'
                                                                        : tee.name.charAt(0).toUpperCase();

                                                                const colorClass = letter === 'W' ? 'bg-zinc-100 text-black'
                                                                    : letter === 'G' ? 'bg-yellow-400 text-black'
                                                                        : 'bg-zinc-500 text-white';

                                                                return (
                                                                    <span className={`text-[10px] font-black px-1 py-0.5 rounded-md ${colorClass} uppercase tracking-widest`}>
                                                                        {letter}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="text-zinc-500 text-xs font-black uppercase tracking-widest">{splitName(player.name).last}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => movePlayerOrder(index, 'up')}
                                                            disabled={index === 0}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${index === 0 ? 'bg-zinc-50 text-zinc-300 cursor-not-allowed' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                                                            title="Move Up"
                                                        >
                                                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M7 14l5-5 5 5z" /></svg>
                                                        </button>
                                                        {(player.isGuest || player.id.startsWith('guest-')) && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingGuest({
                                                                        id: player.id,
                                                                        name: player.name,
                                                                        index: player.index,
                                                                        courseHandicap: player.liveRoundData?.course_hcp || 0
                                                                    });
                                                                    setIsGuestModalOpen(true);
                                                                }}
                                                                className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs hover:bg-blue-600 transition-all shadow-lg"
                                                                title="Edit Guest"
                                                            >
                                                                ✏️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => updateScore(player.id, false)}
                                                        className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 font-black shadow-md active:scale-90 transition-all hover:bg-red-50 hover:border-red-500/30 text-4xl"
                                                        title="Decrease Score"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="w-12 text-center font-black text-4xl italic tracking-tighter text-zinc-900">
                                                        {score || activeHolePar}
                                                    </div>
                                                    <button
                                                        onClick={() => updateScore(player.id, true)}
                                                        className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 font-black shadow-md active:scale-90 transition-all hover:bg-green-50 hover:border-green-500/30 text-4xl"
                                                        title="Increase Score"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {effectiveScoringPlayers.length === 0 && (
                                <div className="py-1 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 mb-1">
                                    <p className="text-gray-500 font-bold text-[15pt] mb-1">No players selected for scoring.</p>
                                    <button
                                        onClick={() => setIsPlayerModalOpen(true)}
                                        className="bg-black text-white px-1 py-1 rounded-xl font-bold text-[15pt] shadow-md active:scale-95 transition-all"
                                    >
                                        Add Players / Join
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                }

                <div className="pt-1"></div>
                {/* Live Scores Summary */}
                {
                    summaryPlayers.length > 0 ? (
                        <div id="summary-section" className="mt-1 space-y-1">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => router.refresh()}
                                    className="flex-1 bg-white border border-zinc-200 text-zinc-900 rounded-xl py-1 text-sm font-black uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-md active:scale-95"
                                >
                                    Leaderboard ({summaryPlayers.length})
                                </button>
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                // Get the current round name
                                                const currentRound = allLiveRounds.find(r => r.id === liveRoundId);
                                                const roundName = currentRound?.name || 'Live Scorecard';

                                                // Use helper to generate HTML
                                                if (defaultCourse) {
                                                    const { html, text } = generateClipboardHtml(roundName, rankedPlayers, defaultCourse, scores);

                                                    try {
                                                        const blobHtml = new Blob([html], { type: 'text/html' });
                                                        const blobText = new Blob([text], { type: 'text/plain' });
                                                        await navigator.clipboard.write([
                                                            new ClipboardItem({
                                                                'text/html': blobHtml,
                                                                'text/plain': blobText
                                                            })
                                                        ]);
                                                        showAlert('Copied!', 'Scorecard copied to clipboard');
                                                    } catch (err) {
                                                        console.error('Failed to copy: ', err);
                                                        showAlert('Error', 'Failed to copy scorecard');
                                                    }
                                                }


                                            }}
                                            className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 rounded-xl hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-md active:scale-95"
                                            title="Copy Scorecard"
                                        >
                                            <Copy size={20} />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                // Get emails of ALL players in the round
                                                if (!initialRound?.players) {
                                                    showAlert('No Players', 'No players found in this round.');
                                                    return;
                                                }

                                                const emailSet = new Set<string>();
                                                initialRound.players.forEach((rp: any) => {
                                                    // 1. Try to get email from the player object in the round data
                                                    if (rp.player?.email) {
                                                        emailSet.add(rp.player.email);
                                                    } else if (rp.player?.id) {
                                                        // 2. Fallback: Search in the full allPlayers list
                                                        const fullPlayer = allPlayers.find(p => p.id === rp.player.id);
                                                        if (fullPlayer?.email) {
                                                            emailSet.add(fullPlayer.email);
                                                        }
                                                    }
                                                });

                                                const emailList = Array.from(emailSet).join('; ');

                                                if (!emailList) {
                                                    showAlert('No Emails', 'No emails found for players in this round.');
                                                    return;
                                                }

                                                try {
                                                    await navigator.clipboard.writeText(emailList);
                                                    showAlert('Copied!', 'All player emails from the round copied to clipboard');
                                                } catch (err) {
                                                    console.error('Failed to copy emails: ', err);
                                                    showAlert('Error', 'Failed to copy emails');
                                                }
                                            }}
                                            className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 rounded-xl hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-md active:scale-95"
                                            title="Copy Emails"
                                        >
                                            <Mail size={20} />
                                        </button>

                                        <button
                                            onClick={async () => {
                                                // Get the current round name
                                                const currentRound = allLiveRounds.find(r => r.id === liveRoundId);
                                                const roundName = currentRound?.name || 'Live Scorecard';

                                                // Collect emails
                                                // Collect emails
                                                const emailSet = new Set<string>();

                                                // Use initialRound.players if available (most robust source)
                                                if (initialRound?.players) {
                                                    initialRound.players.forEach((rp: any) => {
                                                        if (rp.player?.email) {
                                                            emailSet.add(rp.player.email);
                                                        } else if (rp.player?.id) {
                                                            const fullPlayer = allPlayers.find(p => p.id === rp.player.id);
                                                            if (fullPlayer?.email) {
                                                                emailSet.add(fullPlayer.email);
                                                            }
                                                        }
                                                    });
                                                } else {
                                                    // Fallback to rankedPlayers if initialRound is not available
                                                    rankedPlayers.forEach(p => {
                                                        const fullPlayer = allPlayers.find(ap => ap.id === p.id);
                                                        if (fullPlayer?.email) {
                                                            emailSet.add(fullPlayer.email);
                                                        } else if (p.email) {
                                                            emailSet.add(p.email);
                                                        }
                                                    });
                                                }

                                                const targetEmail = Array.from(emailSet).join('; ');

                                                if (!targetEmail) {
                                                    showAlert('No Emails', 'No player emails found to send to.');
                                                    return;
                                                }

                                                // Confirm with user
                                                showConfirm("Send Scorecard?", `Send scorecard to: ${targetEmail}?`, async () => {


                                                    // Use helper to generate HTML
                                                    if (defaultCourse) {
                                                        const html = generateScorecardHtml(roundName, rankedPlayers, defaultCourse, scores);

                                                        // 3. Send the email
                                                        // 3. Send the email WITHOUT alerting "Sending..."
                                                        // showAlert('Sending...', 'Sending emails to all players...');

                                                        const result = await sendScorecardEmail(
                                                            targetEmail,
                                                            `*** For Testing *** GolfLS Leaderboard`,
                                                            html,
                                                            `*** For Testing *** GolfLS Leaderboard`
                                                        );

                                                        if (!result.success) {
                                                            showAlert('Failed', `Error: ${result.error}`);
                                                        }
                                                        // No success alert per request
                                                    }
                                                });
                                            }}
                                            className="w-12 h-12 flex items-center justify-center bg-green-50 text-green-600 border border-green-200 rounded-xl hover:bg-green-100 transition-all shadow-md active:scale-95"
                                            title="Send Scorecard to All"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setIsStatsModalOpen(true)}
                                    className="w-12 h-12 bg-white border border-zinc-200 text-zinc-500 rounded-xl flex items-center justify-center hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-md active:scale-95"
                                    title="View Stats"
                                >
                                    <Bird size={24} />
                                </button>
                                <button
                                    onClick={() => setIsPoolModalOpen(true)}
                                    className="px-1 h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all bg-green-600 text-white border border-green-700 hover:bg-green-700 shadow-md active:scale-95"
                                >
                                    BFT
                                </button>


                            </div>

                            <div className="space-y-1">
                                {rankedPlayers.map((p) => (
                                    <LiveLeaderboardCard
                                        key={p.id}
                                        player={p}
                                        scores={scores.get(p.id) || new Map()}
                                        activeHole={activeHole}
                                        isAdmin={isAdmin}
                                        summaryEditCell={summaryEditCell}
                                        setSummaryEditCell={setSummaryEditCell}
                                        handleAdminScoreChange={handleAdminScoreChange}
                                        defaultCourse={defaultCourse}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div key="no-players" className="bg-white rounded-full shadow-lg border-2 border-gray-300 p-8 text-center m-1">
                            <p className="text-gray-500 font-bold text-[15pt]">
                                {(() => {
                                    const firstName = (currentUserName || 'Player').split(' ')[0];
                                    return `Welcome ${firstName} to your 1st round!`;
                                })()}
                            </p>
                        </div>
                    )
                }




                {/* Score Notation Legend */}
                {
                    rankedPlayers.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4 m-1 mt-4">
                            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                                {/* Eagle */}
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-sm bg-yellow-300"></div>
                                    <span className="text-xs font-bold text-zinc-600">(-2)</span>
                                </div>
                                {/* Birdie */}
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-sm bg-green-300"></div>
                                    <span className="text-xs font-bold text-zinc-600">(-1)</span>
                                </div>
                                {/* Par */}
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-sm bg-white border border-zinc-200"></div>
                                    <span className="text-xs font-bold text-zinc-600">(E)</span>
                                </div>
                                {/* Bogey */}
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-sm bg-orange-300"></div>
                                    <span className="text-xs font-bold text-zinc-600">(+1)</span>
                                </div>
                                {/* Double Bogey */}
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-sm bg-red-300"></div>
                                    <span className="text-xs font-bold text-zinc-600">(+2)</span>
                                </div>
                            </div>
                        </div>
                    )
                }

            </main >

            {/* Add to Club Modal */}
            < AddToClubModal
                isOpen={isAddToClubModalOpen}
                onClose={() => setIsAddToClubModalOpen(false)}
                players={isAdmin ? rankedPlayers : rankedPlayers.filter(p => effectiveScoringPlayers.some(sp => sp.id === p.id))}
                liveRoundId={liveRoundId || ''}
                onSave={handleCopyToClub}
            />

            {/* Stats Modal */}
            {
                isStatsModalOpen && (
                    <div className="fixed inset-0 z-[300] bg-gray-50 overflow-y-auto">
                        {/* Header */}
                        <div className="bg-white shadow-sm sticky top-0 z-10 px-1 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h1 className="text-[18pt] font-bold text-gray-900 tracking-tight text-left ml-3">Round Stats</h1>
                                <button
                                    onClick={() => setIsStatsModalOpen(false)}
                                    className="px-1 py-2 bg-black text-white rounded-xl text-[14pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 space-y-4">
                            {/* Birdies Section */}
                            <div className="bg-white rounded-xl shadow-lg p-3 border-2 border-green-500">
                                <h2 className="text-[16pt] font-bold text-green-700 mb-3 flex items-center gap-2">
                                    <Bird size={32} className="text-green-600" /> Birdies (1 Under Par)
                                </h2>
                                <div className="space-y-2">
                                    {birdieLeaders.length > 0 ? (
                                        birdieLeaders.map(player => (
                                            <div key={player.id} className="flex justify-between items-center bg-green-50 rounded-lg p-2">
                                                <span className="text-[15pt] font-bold text-gray-900">{player.name}</span>
                                                <span className="text-[18pt] font-black text-green-700">{player.birdieCount}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No birdies yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Eagles Section */}
                            <div className="bg-white rounded-xl shadow-lg p-3 border-2 border-yellow-500">
                                <h2 className="text-[16pt] font-bold text-yellow-700 mb-3 flex items-center gap-2">
                                    🦅 Eagles (2 Under Par)
                                </h2>
                                <div className="space-y-2">
                                    {eagleLeaders.length > 0 ? (
                                        eagleLeaders.map(player => (
                                            <div key={player.id} className="flex justify-between items-center bg-yellow-50 rounded-lg p-2">
                                                <span className="text-[15pt] font-bold text-gray-900">{player.name}</span>
                                                <span className="text-[18pt] font-black text-yellow-700">{player.eagleCount}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No eagles yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Birdie Celebration Popup */}
            {
                birdiePlayers.length > 0 && (
                    <div
                        className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
                        onClick={() => setBirdiePlayers([])}
                    >
                        <div
                            className="animate-in zoom-in-95 duration-500 flex flex-col items-center gap-4"
                            onClick={(e) => e.stopPropagation()}
                        >

                            <div className="bg-white text-black rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center max-w-sm mx-4 border-4 border-green-500">
                                <div className="text-[100pt] leading-none mb-2">🐦</div>
                                <h1 className="text-[30pt] font-black text-green-600 mb-4 text-center leading-tight drop-shadow-sm uppercase italic">Beautiful Birdie!</h1>

                                <div className="text-[18pt] font-bold text-gray-900 text-center mb-4 w-full">
                                    {[...birdiePlayers].sort((a, b) => b.totalBirdies - a.totalBirdies).map((player, index) => (
                                        <div key={index} className="mb-2 last:mb-0 border-b last:border-0 border-gray-100 pb-2 last:pb-0">
                                            <div className="leading-tight">{player.name}</div>
                                            <div className="text-[14pt] text-green-600 font-bold leading-tight">
                                                {player.totalBirdies} {player.totalBirdies === 1 ? 'Birdie' : 'Birdies'} Total
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setBirdiePlayers([]);
                                    }}
                                    className="w-full bg-black text-white rounded-xl py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Eagle Celebration Popup */}
            {
                eaglePlayers.length > 0 && (
                    <div
                        className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
                        onClick={() => setEaglePlayers([])}
                    >
                        <div
                            className="animate-in zoom-in-95 duration-500 flex flex-col items-center gap-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white text-black rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center max-w-sm mx-4 border-4 border-yellow-400">
                                <div className="text-[100pt] leading-none mb-2">🦅</div>
                                <h1 className="text-[30pt] font-black text-yellow-500 mb-4 text-center leading-tight drop-shadow-sm uppercase italic">Awesome Eagle!</h1>

                                <div className="text-[18pt] font-bold text-gray-900 text-center mb-4 w-full">
                                    {[...eaglePlayers].sort((a, b) => b.totalEagles - a.totalEagles).map((player, index) => (
                                        <div key={index} className="mb-2 last:mb-0 border-b last:border-0 border-gray-100 pb-2 last:pb-0">
                                            <div className="leading-tight">{player.name}</div>
                                            <div className="text-[14pt] text-yellow-600 font-bold leading-tight">
                                                {player.totalEagles} {player.totalEagles === 1 ? 'Eagle' : 'Eagles'} Total
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEaglePlayers([]);
                                    }}
                                    className="w-full bg-black text-white rounded-xl py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {
                isAddToClubModalOpen && (
                    <AddToClubModal
                        isOpen={isAddToClubModalOpen}
                        onClose={() => setIsAddToClubModalOpen(false)}
                        onSave={async () => {
                            setIsAddToClubModalOpen(false);
                        }}
                        players={allPlayers}
                        liveRoundId={liveRoundId || ''}
                    />
                )
            }

            {/* Pool Modal */}
            {
                isPoolModalOpen && liveRoundId && (
                    <PoolModal
                        roundId={liveRoundId}
                        isOpen={isPoolModalOpen}
                        onClose={() => setIsPoolModalOpen(false)}
                    />
                )
            }

            {
                confirmConfig && (
                    <ConfirmModal
                        isOpen={confirmConfig.isOpen}
                        title={confirmConfig.title}
                        message={confirmConfig.message}
                        isDestructive={confirmConfig.isDestructive}
                        confirmText={confirmConfig.confirmText}
                        cancelText={confirmConfig.cancelText}
                        hideCancel={confirmConfig.hideCancel}
                        onConfirm={confirmConfig.onConfirm}
                        onCancel={() => setConfirmConfig(null)}
                    />
                )
            }

        </div >
    );
}
