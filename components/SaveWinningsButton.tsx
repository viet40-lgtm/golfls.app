'use client';
import { useState, useEffect } from 'react';
import { saveRoundWinnings } from '@/app/actions';
import Cookies from 'js-cookie';
import ConfirmModal from './ConfirmModal';

interface PayoutEntry {
    playerId: string;
    amount: number;
}

export function SaveWinningsButton({
    roundId,
    payouts
}: {
    roundId: string;
    payouts: PayoutEntry[]
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    } | null>(null);

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

    const handleSave = () => {
        setConfirmConfig({
            isOpen: true,
            title: 'Save Winnings',
            message: 'This will save these calculated winnings to the database. Continue?',
            isDestructive: false,
            onConfirm: async () => {
                setConfirmConfig(null);
                setIsSaving(true);
                try {
                    await saveRoundWinnings(roundId, payouts);
                    alert('Winnings saved successfully!');
                } catch (err) {
                    console.error(err);
                    alert('Failed to save winnings.');
                } finally {
                    setIsSaving(false);
                }
            }
        });
    };

    // Only render for admins
    if (!isAdmin) return null;

    return (
        <div className="pt-4">
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold px-1 py-2 rounded-full shadow-sm transition-colors text-[14pt] uppercase tracking-wider flex items-center justify-center gap-2 h-auto cursor-pointer disabled:opacity-50"
            >
                {isSaving ? (
                    <>
                        <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Saving...
                    </>
                ) : (
                    'Save Pool'
                )}
            </button>

            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDestructive={confirmConfig.isDestructive}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}
