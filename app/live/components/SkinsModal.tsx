import { useState, useMemo, useEffect } from 'react';
import { X, Users, CheckSquare, Square, Trash2, Copy } from 'lucide-react';
import { calculateSkins, type SkinResult } from '@/lib/skins';
import { updateSkinsParticipants } from '../actions/skins';
import { Toast } from './Toast';

interface SkinsModalProps {
    isOpen: boolean;
    onClose: () => void;
    liveRoundId: string;
    holes: { number: number; par: number; difficulty: number }[];
    potentialPlayers: { id: string; name: string; courseHandicap: number; scores: Record<number, number>; scorerId?: string | null }[];
    participantIds: Record<string, string[]>;
    onParticipantsChange: (ids: Record<string, string[]>) => void;
    isAdmin?: boolean;
}

export function SkinsModal({
    isOpen,
    onClose,
    liveRoundId, // retained for compatibility if needed
    holes,
    potentialPlayers,
    participantIds,
    onParticipantsChange,
    isAdmin = false
}: SkinsModalProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [carryOversByGroup, setCarryOversByGroup] = useState<Record<string, boolean>>({ '1': true });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [initialParticipantIds, setInitialParticipantIds] = useState<Record<string, string[]>>({});
    const [initialCarryOvers, setInitialCarryOvers] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            setInitialParticipantIds(participantIds);
            setInitialCarryOvers(carryOversByGroup);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const hasChanges = useMemo(() => {
        return JSON.stringify(initialParticipantIds) !== JSON.stringify(participantIds) ||
            JSON.stringify(initialCarryOvers) !== JSON.stringify(carryOversByGroup);
    }, [initialParticipantIds, participantIds, initialCarryOvers, carryOversByGroup]);

    const handleToggle = (playerId: string) => {
        if (!activeGroup) return;
        const currentIds = participantIds[activeGroup] || [];
        const isParticipating = currentIds.includes(playerId);

        const newGroupIds = isParticipating
            ? currentIds.filter(id => id !== playerId)
            : [...currentIds, playerId];

        onParticipantsChange({
            ...participantIds,
            [activeGroup]: newGroupIds
        });
    };

    const handleNewGroup = () => {
        const existingGroupIds = Object.keys(participantIds).map(Number).filter(n => !isNaN(n));
        let nextGroupIdNum = 1;
        while (existingGroupIds.includes(nextGroupIdNum)) {
            nextGroupIdNum++;
        }
        const nextGroupId = String(nextGroupIdNum);

        onParticipantsChange({
            ...participantIds,
            [nextGroupId]: []
        });

        setCarryOversByGroup(prev => ({
            ...prev,
            [nextGroupId]: true
        }));

        setActiveGroup(nextGroupId);
    };

    const handleDeleteGroup = (gid: string) => {
        const newParticipantIds = { ...participantIds };
        delete newParticipantIds[gid];
        onParticipantsChange(newParticipantIds);

        const newCarryOvers = { ...carryOversByGroup };
        delete newCarryOvers[gid];
        setCarryOversByGroup(newCarryOvers);

        if (activeGroup === gid) {
            const remaining = Object.keys(newParticipantIds);
            const nextGroupId = remaining.length > 0 ? remaining[0] : null;
            setActiveGroup(nextGroupId);
        }
    };

    const resultsByGroup = useMemo(() => {
        const results: Record<string, any> = {};
        Object.keys(participantIds).forEach(gid => {
            const pids = participantIds[gid] || [];
            if (pids.length > 0) {
                const isCarryOver = carryOversByGroup[gid] ?? true;
                results[gid] = calculateSkins(potentialPlayers, holes, pids, isCarryOver);
            }
        });
        return results;
    }, [potentialPlayers, holes, participantIds, carryOversByGroup]);

    const playerDisplayNames = useMemo(() => {
        const nameMap: Record<string, string> = {};
        const allPids = Object.values(participantIds).flat();
        const participants = potentialPlayers.filter(p => allPids.includes(p.id));
        const firstNames = participants.map(p => p.name.split(' ')[0]);

        potentialPlayers.forEach(p => {
            const parts = p.name.split(' ');
            const firstName = parts[0];
            const hasDuplicate = firstNames.filter(name => name === firstName).length > 1;

            if (hasDuplicate && parts.length > 1) {
                nameMap[p.id] = `${firstName} ${parts[1][0]}.`;
            } else {
                nameMap[p.id] = firstName;
            }
        });

        return nameMap;
    }, [potentialPlayers, participantIds]);

    const handleCopyEmail = async () => {
        let html = `<html><body style="margin: 0; padding: 0;"><div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 15px; max-width: 600px;">`;
        html += `<h2 style="margin: 0 0 24px 0; font-weight: 900; font-size: 26px; text-transform: uppercase; color: #000000; letter-spacing: -0.05em;">Skins Results</h2>`;

        let plainText = `Skins Results\n\n`;

        const groupIds = Object.keys(participantIds).sort();

        groupIds.forEach((gid, index) => {
            const pids = participantIds[gid];
            if (pids.length < 2) return;

            const groupPlayers = potentialPlayers.filter(p => pids.includes(p.id));
            const res = resultsByGroup[gid];
            if (!res) return;

            // Thick black line between groups
            if (index > 0) {
                html += `
                    <br />
                    <hr size="4" color="#000000" style="height: 4px; background-color: #000000; border: none; margin: 30px 0 10px 0;" />
                    <br />
                `;
            }

            // Group Header - simple div followed by an HR
            html += `
                <div style="font-family: inherit; font-weight: 900; font-size: 24px; color: #000000; padding-bottom: 4px; margin-top: ${index === 0 ? '30px' : '0'};">
                    Grp ${gid} (${pids.length})
                </div>
                <!-- Line specifically under the group header -->
                <hr size="4" color="#000000" style="height: 4px; background-color: #000000; border: none; margin: 0 0 20px 0;" />
            `;
            plainText += `Group ${gid}:\n`;

            // Sort by skins won desc
            const sortedPlayers = [...groupPlayers].sort((a, b) => {
                const skinsA = res?.playerTotals[a.id]?.skins || 0;
                const skinsB = res?.playerTotals[b.id]?.skins || 0;
                if (skinsB !== skinsA) return skinsB - skinsA;
                return a.name.localeCompare(b.name);
            });

            sortedPlayers.forEach(p => {
                const stats = res?.playerTotals[p.id];
                const mySkins = stats?.skins || 0;
                const totalSkins = groupPlayers.reduce((sum, ap) => sum + (res?.playerTotals[ap.id]?.skins || 0), 0);
                const net = (mySkins * groupPlayers.length) - totalSkins;

                const holesWon = [
                    ...(res?.holeResults.filter((hr: any) => hr.ultimateWinnerId === p.id).map((hr: any) => ({ num: hr.holeNumber, type: 'carry' })) || []),
                    ...(res?.holeResults.filter((hr: any) => hr.winnerId === p.id).map((hr: any) => ({ num: hr.holeNumber, type: 'direct' })) || [])
                ].sort((a, b) => a.num - b.num);

                // Player Card
                html += `
                    <table width="100%" cellpadding="10" cellspacing="0" border="0" style="margin-bottom: 8px; border: 2px solid #000000; border-radius: 12px; border-collapse: separate; background-color: #ffffff;">
                        <tr>
                            <td>
                                <!-- Row 1: Name and Results -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed;">
                                    <tr>
                                        <td align="left" style="font-family: inherit; font-size: 17px; font-weight: 900; color: #000000; overflow: hidden; white-space: nowrap;">
                                            ${playerDisplayNames[p.id]}
                                        </td>
                                        <td width="110" align="right" style="font-family: inherit; font-size: 17px; font-weight: 900; color: ${mySkins > 0 ? '#16a34a' : '#000000'};">
                                            ${mySkins} ${mySkins === 1 ? 'Skin' : 'Skins'}
                                        </td>
                                        <td width="70" align="right" style="font-family: inherit; font-size: 17px; font-weight: 900; color: ${net > 0 ? '#16a34a' : (net < 0 ? '#ef4444' : '#000000')};">
                                            ${net > 0 ? '+' : ''}${net}
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Row 2: Hole Grid (Using nested tables for color compatibility and spacing) -->
                                <div style="margin-top: 10px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed;">
                                        <tr>
                                            ${Array.from({ length: 18 }, (_, i) => i + 1).map(num => {
                    const hw = holesWon.find(h => h.num === num);
                    const bgColor = hw ? (hw.type === 'direct' ? '#ff3b30' : '#3b82f6') : '';
                    return `
                                                    <td align="center" style="width: 5.5%;">
                                                        ${hw ? `
                                                            <table width="19" height="19" cellpadding="0" cellspacing="0" border="0" bgcolor="${bgColor}" style="border-radius: 4px; background-color: ${bgColor}; margin: 0 auto;">
                                                                <tr>
                                                                    <td align="center" valign="middle" style="font-family: inherit; font-weight: 900; font-size: 14px; color: #ffffff; line-height: 19px;">
                                                                        ${hw.num}
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        ` : '<div style="width: 19px; height: 19px;"></div>'}
                                                    </td>
                                                `;
                }).join('')}
                                        </tr>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </table>
                `;

                plainText += `- ${playerDisplayNames[p.id]}: ${mySkins} ${mySkins === 1 ? 'Skin' : 'Skins'} (${net > 0 ? '+' : ''}${net})${holesWon.length > 0 ? ` [Holes: ${holesWon.map(h => h.num).join(', ')}]` : ''}\n`;
            });
            plainText += `\n`;
        });
        html += `</div></body></html>`;

        try {
            const blobHtml = new Blob([html], { type: 'text/html' });
            const blobText = new Blob([plainText], { type: 'text/plain' });
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                })
            ]);
            setToast({ message: 'Copied for email!', type: 'success' });
        } catch (err) {
            console.error('Failed to copy html:', err);
            navigator.clipboard.writeText(plainText);
            setToast({ message: 'Copied (text only)', type: 'error' });
        }
    };

    const handleSave = async () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        setIsUpdating(true);
        try {
            await updateSkinsParticipants(liveRoundId, participantIds);
            setInitialParticipantIds(participantIds);
            setInitialCarryOvers(carryOversByGroup);
            onClose();
        } catch (error) {
            console.error("Failed to save skins:", error);
            setToast({ message: 'Failed to save skins', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 h-[100dvh] z-[200] bg-white flex flex-col overflow-hidden font-sans">
            {/* Sticky Header */}
            <div className="px-1 py-4 border-b-2 border-black bg-white sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-lg">
                        <span className="text-[15pt] font-black text-green-700">$</span>
                    </div>
                    <div>
                        <h2 className="text-[18pt] font-black text-black leading-none uppercase tracking-tighter">SKINS GAME</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <button
                            onClick={handleCopyEmail}
                            title="Copy for Email"
                            className="p-2 bg-slate-100 text-black rounded-full hover:bg-slate-200 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                        >
                            <Copy className="w-6 h-6" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        title="Close"
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-black transition-all shadow-md active:scale-95 flex items-center justify-center min-w-[50px]"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
                <div className="px-1 py-4 space-y-6">

                    {/* Section 1: All Player Assignment Groups Together */}
                    <div className="space-y-6">
                        <div className="flex justify-center mb-4">
                            <button
                                onClick={handleNewGroup}
                                className="px-6 py-2 bg-black text-white rounded-full text-[15pt] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md"
                            >
                                + New Group
                            </button>
                        </div>

                        {Object.keys(participantIds).sort().map(gid => {
                            const pids = participantIds[gid];
                            // ONLY show if it has players OR if it is being actively edited
                            if (pids.length === 0 && activeGroup !== gid) return null;

                            const groupPlayers = potentialPlayers.filter(p => pids.includes(p.id));
                            const res = resultsByGroup[gid];

                            return (
                                <div key={gid} className="space-y-4">
                                    <div className="flex items-center justify-between border-b-4 border-black pb-1">
                                        <span className="text-[18pt] font-black text-black tracking-tight">
                                            Grp {gid} ({pids.length})
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setActiveGroup(activeGroup === gid ? null : gid)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black active:scale-95 transition-all shadow-sm ${activeGroup === gid ? 'bg-black text-white' : 'bg-white text-black'}`}
                                            >
                                                <Users className="w-5 h-5" />
                                                <span className="text-[15pt] font-bold">Players</span>
                                            </button>
                                            <button
                                                onClick={() => setCarryOversByGroup(prev => ({ ...prev, [gid]: !(prev[gid] ?? true) }))}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border-2 border-black active:scale-95 transition-all shadow-sm"
                                            >
                                                {(carryOversByGroup[gid] ?? true) ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-black" />}
                                                <span className="text-[15pt] font-black tracking-tighter">Carryover</span>
                                            </button>
                                            {pids.length === 0 && (
                                                <button
                                                    onClick={() => handleDeleteGroup(gid)}
                                                    className="p-1.5 rounded-xl border-2 border-red-500 text-red-500 bg-red-50 active:scale-95 transition-all shadow-sm"
                                                    title="Delete Group"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        {[...groupPlayers].sort((a, b) => {
                                            const skinsA = res?.playerTotals[a.id]?.skins || 0;
                                            const skinsB = res?.playerTotals[b.id]?.skins || 0;
                                            if (skinsB !== skinsA) return skinsB - skinsA;
                                            return a.name.localeCompare(b.name);
                                        }).map(p => {
                                            const stats = res?.playerTotals[p.id];
                                            const mySkins = stats?.skins || 0;
                                            const totalSkins = groupPlayers.reduce((sum, ap) => sum + (res?.playerTotals[ap.id]?.skins || 0), 0);
                                            const net = (mySkins * groupPlayers.length) - totalSkins;

                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleToggle(p.id)}
                                                    className="flex flex-col px-1 py-2 rounded-xl border-2 border-black bg-white shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-[18pt] font-black text-black flex-1 truncate mr-2">
                                                            {playerDisplayNames[p.id]}
                                                        </span>
                                                        <div className="flex items-center">
                                                            <div className="w-[110px] text-right">
                                                                <span className={`text-[18pt] font-black ${mySkins > 0 ? 'text-green-600' : 'text-black'}`}>
                                                                    {mySkins} {mySkins === 1 ? 'Skin' : 'Skins'}
                                                                </span>
                                                            </div>
                                                            <div className="w-[60px] text-right">
                                                                <span className={`text-[18pt] font-black ${net > 0 ? 'text-green-600' : (net < 0 ? 'text-red-500' : 'text-black')}`}>
                                                                    {net > 0 ? '+' : ''}{net}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {(() => {
                                                        const holesWon = [
                                                            ...(res?.holeResults.filter((hr: any) => hr.ultimateWinnerId === p.id).map((hr: any) => ({ num: hr.holeNumber, type: 'carry' })) || []),
                                                            ...(res?.holeResults.filter((hr: any) => hr.winnerId === p.id).map((hr: any) => ({ num: hr.holeNumber, type: 'direct' })) || [])
                                                        ].sort((a, b) => a.num - b.num);

                                                        if (holesWon.length === 0) return null;

                                                        return (
                                                            <div className="mt-1 w-full grid grid-cols-[repeat(18,1fr)] gap-[1px]">
                                                                {Array.from({ length: 18 }, (_, i) => i + 1).map(num => {
                                                                    const hw = holesWon.find(h => h.num === num);
                                                                    return (
                                                                        <div key={num} className="flex items-center justify-center p-[0.5px]">
                                                                            {hw ? (
                                                                                <div
                                                                                    className={`w-full aspect-square flex items-center justify-center rounded-sm text-[15pt] font-black text-white ${hw.type === 'direct' ? 'bg-[#ff3b30]' : 'bg-[#3b82f6]'} leading-none tracking-tighter`}
                                                                                >
                                                                                    {hw.num}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="w-full aspect-square" />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}
                                        {groupPlayers.length === 0 && (
                                            <div className="py-6 text-center border-2 border-dashed border-black/10 rounded-xl bg-white/50">
                                                <span className="text-[15pt] font-bold text-black">TAP AVAILABLE PLAYERS TO ADD TO GROUP {gid}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>



                </div>
            </div>

            {/* Player Selection Popup */}
            {activeGroup !== null && (
                <div className="fixed inset-0 z-[300] bg-white flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="bg-black text-white px-4 py-4 flex justify-between items-center shadow-md shrink-0">
                            <h2 className="text-[18pt] font-black uppercase">Grp {activeGroup} Players</h2>
                            <button
                                onClick={() => setActiveGroup(null)}
                                className="text-white p-2 rounded-full hover:bg-gray-800"
                                title="Close popup"
                            >
                                <X className="w-8 h-8" />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            <div className="grid grid-cols-1 gap-2">
                                {[...potentialPlayers].sort((a, b) => {
                                    // Sort by scorerId (Scorekeeper Group)
                                    const scorerA = a.scorerId || 'zzzz';
                                    const scorerB = b.scorerId || 'zzzz';
                                    if (scorerA !== scorerB) return scorerA.localeCompare(scorerB);
                                    return a.name.localeCompare(b.name);
                                }).map(p => {
                                    const assignedGroup = Object.keys(participantIds).find(gid => participantIds[gid]?.includes(p.id));
                                    const inThisGroup = assignedGroup === activeGroup;
                                    const inOtherGroup = assignedGroup && !inThisGroup;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => !inOtherGroup && handleToggle(p.id)}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 ${inThisGroup
                                                ? 'bg-green-600 border-green-700 text-white shadow-md'
                                                : inOtherGroup
                                                    ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-80'
                                                    : 'bg-white border-black/10 text-black shadow-sm'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 ${inThisGroup ? 'bg-white border-white' : inOtherGroup ? 'bg-gray-300 border-gray-400' : 'bg-white border-black/10'}`}>
                                                {(inThisGroup || inOtherGroup) && <CheckSquare className={`w-6 h-6 ${inThisGroup ? 'text-green-600' : 'text-gray-500'}`} />}
                                            </div>
                                            <span className="text-[18pt] font-black truncate flex-1">
                                                {playerDisplayNames[p.id]}
                                            </span>
                                            {inOtherGroup && <span className="text-[15pt] font-bold opacity-60">Grp {assignedGroup}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="p-4 bg-white border-t-2 border-black">
                            <button
                                onClick={() => setActiveGroup(null)}
                                className="w-full bg-black text-white py-4 rounded-full text-[18pt] font-black tracking-widest uppercase active:scale-95 shadow-md flex items-center justify-center"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="bg-white border-t-2 border-black flex w-full px-1 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <button
                    onClick={hasChanges ? handleSave : onClose}
                    disabled={isUpdating}
                    title={hasChanges ? 'Save changes' : 'Close'}
                    className={`flex-1 py-4 rounded-full text-[15pt] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer ${hasChanges ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-black text-white hover:bg-black'}`}
                >
                    {hasChanges ? 'Save' : 'Close'}
                </button>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

