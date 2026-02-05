
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiveRoundModal } from '@/components/LiveRoundModal';
import { createDefaultLiveRound } from '@/app/actions/create-live-round';

export default function Live2Client() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [allCourses, setAllCourses] = useState<any[]>([]);

    useEffect(() => {
        // Fetch courses for the modal
        fetch('/api/courses')
            .then(res => res.json())
            .then(data => setAllCourses(data))
            .catch(err => setStatus('Failed to load courses: ' + err.message));
    }, []);

    const handleCreateDefault = async () => {
        setStatus('Creating...');
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const result = await createDefaultLiveRound(dateStr, "Test User");
            if (result.success) {
                setStatus('Success!');
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
                    New Round
                </button>

                <div className="h-px bg-gray-200 my-2"></div>

                <div className="text-sm text-gray-400">Debug Tools</div>
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

            {/* Real Modal */}
            <LiveRoundModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                allCourses={allCourses}
                showAlert={(title, msg) => alert(`${title}: ${msg}`)}
                defaultTeeBoxId={undefined}
                currentUserId={'diagnostic-user'}
            />
        </div>
    );
}
