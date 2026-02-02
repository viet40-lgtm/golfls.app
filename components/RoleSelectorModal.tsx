'use client';

import { useState } from 'react';

interface RoleSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRole: (role: 'scorer' | 'viewer') => void;
}

export default function RoleSelectorModal({
    isOpen,
    onClose,
    onSelectRole
}: RoleSelectorModalProps) {
    const [selectedRole, setSelectedRole] = useState<'scorer' | 'viewer' | null>(null);

    if (!isOpen) return null;

    const handleContinue = () => {
        if (selectedRole) {
            onSelectRole(selectedRole);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
                <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
                    Choose Your Role
                </h2>
                <p className="text-sm text-gray-600 mb-6 text-center">
                    Select how you want to participate in this round
                </p>

                <div className="space-y-4 mb-6">
                    {/* Scorer Option */}
                    <button
                        onClick={() => setSelectedRole('scorer')}
                        className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${selectedRole === 'scorer'
                                ? 'border-green-600 bg-green-50 shadow-lg scale-105'
                                : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">📝</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    SCORER
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Keep scores for yourself and/or other players in your group
                                </p>
                            </div>
                            {selectedRole === 'scorer' && (
                                <div className="text-green-600 text-2xl">✓</div>
                            )}
                        </div>
                    </button>

                    {/* Viewer Option */}
                    <button
                        onClick={() => setSelectedRole('viewer')}
                        className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${selectedRole === 'viewer'
                                ? 'border-blue-600 bg-blue-50 shadow-lg scale-105'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">👁️</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    VIEWER
                                </h3>
                                <p className="text-sm text-gray-600">
                                    View GPS, leaderboard, and live scores (read-only)
                                </p>
                            </div>
                            {selectedRole === 'viewer' && (
                                <div className="text-blue-600 text-2xl">✓</div>
                            )}
                        </div>
                    </button>
                </div>

                <button
                    onClick={handleContinue}
                    disabled={!selectedRole}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedRole
                            ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
