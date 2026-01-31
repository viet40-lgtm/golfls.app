'use client';

import { useState, useEffect } from 'react';
import { ManagePoolModal } from './ManagePoolModal';
import Cookies from 'js-cookie';

interface Player {
    id: string;
    name: string;
}

export function PoolManagementButton({
    roundId,
    allPlayers,
    currentParticipantIds
}: {
    roundId: string;
    allPlayers: Player[];
    currentParticipantIds: string[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Check admin status on mount and when admin status changes
    useEffect(() => {
        const checkAdmin = () => {
            const adminCookie = Cookies.get('admin_session');
            setIsAdmin(adminCookie === 'true');
        };

        checkAdmin();

        // Listen for admin status changes
        window.addEventListener('admin-change', checkAdmin);
        return () => window.removeEventListener('admin-change', checkAdmin);
    }, []);

    // Also check admin status whenever modal opens
    useEffect(() => {
        if (isOpen) {
            const adminCookie = Cookies.get('admin_session');
            setIsAdmin(adminCookie === 'true');
        }
    }, [isOpen]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-black text-white px-4 py-2 rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
            >
                Players ({currentParticipantIds.length})
            </button>

            <ManagePoolModal
                roundId={roundId}
                allPlayers={allPlayers}
                initialSelectedIds={currentParticipantIds}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                isAdmin={isAdmin}
            />
        </>
    );
}
