
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Import the modal logic cleanly or replicate minimal version?
// Let's try to just use a simple button that calls an API to create a round first, 
// to prove we can do ANYTHING.
// But user wants "New" button which implies the Modal.
// I will import the LiveRoundModal BUT I will feed it minimal props.

import { LiveRoundModal } from '@/components/LiveRoundModal';
import { createDefaultLiveRound } from '@/app/actions/create-live-round';

export default function Live2Client() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [status, setStatus] = useState('Idle');

    const handleCreateDefault = async () => {
        setStatus('Creating...');
        try {
            // Use a specific SAFE action or API?
            // Let's try the existing action first, but if it fails, we know.
            const dateStr = new Date().toISOString().split('T')[0];
            const result = await createDefaultLiveRound(dateStr, "Test User");
            if (result.success) {
                setStatus('Success! ID: ' + result.liveRoundId);
                // Optionally redirect
                // router.push('/live?roundId=' + result.liveRoundId);
            } else {
                setStatus('Error: ' + result.error);
            }
        } catch (e: any) {
            setStatus('Crash: ' + e.message);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl border-4 border-black text-center space-y-4">
            <div className="text-xl font-bold">Live 2 Control Center</div>

            <div className="flex flex-col gap-4">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-black text-white px-8 py-4 rounded-xl text-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                >
                    New Round (Modal)
                </button>

                <div className="h-px bg-gray-200 my-2"></div>

                <button
                    onClick={handleCreateDefault}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700"
                >
                    Quick Create Default
                </button>
            </div>

            <div className="mt-4 p-4 bg-gray-50 font-mono text-sm break-all">
                Status: {status}
            </div>

            {/* Render Modal if Open */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white p-8 rounded-xl">
                        <h2 className="text-xl font-bold mb-4">Modal Placeholder</h2>
                        <p className="mb-4">This proves the button works.</p>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="bg-gray-200 px-4 py-2 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
