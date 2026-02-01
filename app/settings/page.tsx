'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Navigation, Bell, Shield, Info, Smartphone } from 'lucide-react';

export default function SettingsPage() {
    const [isGPSEnabled, setIsGPSEnabled] = useState(false);

    useEffect(() => {
        // Hydrate from localStorage
        const saved = localStorage.getItem('gps_enabled_pref');
        if (saved !== null) {
            setIsGPSEnabled(saved === 'true');
        }
    }, []);

    const toggleGPS = () => {
        const newValue = !isGPSEnabled;
        setIsGPSEnabled(newValue);
        localStorage.setItem('gps_enabled_pref', String(newValue));

        // Also trigger a custom event for other clients (like LiveScoreClient) to react if they want
        window.dispatchEvent(new CustomEvent('gps-pref-change', { detail: newValue }));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-100 p-4 pt-10 sticky top-0 z-40">
                <div className="max-w-xl mx-auto flex items-center gap-4">
                    <Link href="/live" className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter">Settings</h1>
                </div>
            </div>

            <main className="max-w-xl mx-auto p-4 space-y-6">
                {/* 1st Section: GPS Setting */}
                <section className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Location Services</h2>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">Turn on GPS setting</h3>
                                    <p className="text-sm text-gray-400 font-medium">Enable real-time distances on mobile</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleGPS}
                                title="Toggle GPS"
                                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${isGPSEnabled ? 'bg-green-600' : 'bg-gray-200'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 transform ${isGPSEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {!isGPSEnabled && (
                            <button
                                onClick={() => {
                                    toggleGPS();
                                    navigator.geolocation.getCurrentPosition(() => { }, () => { });
                                }}
                                className="w-full bg-black text-white py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-md active:scale-95 transition-all"
                            >
                                Confirm & Activate GPS
                            </button>
                        )}

                        {isGPSEnabled && (
                            <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <Navigation className="w-5 h-5 text-green-600 mt-0.5" />
                                <div className="text-xs text-green-800 font-bold leading-relaxed">
                                    GPS is ready. Please ensure your phone's system location is ALSO active and you've granted browser permissions.
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Other Sections (Placeholders for polished feel) */}
                <section className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">App Preferences</h2>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <SettingsItem icon={<Bell className="w-5 h-5" />} label="Notifications" active={false} />
                        <SettingsItem icon={<Shield className="w-5 h-5" />} label="Privacy & Security" />
                        <SettingsItem icon={<Info className="w-5 h-5" />} label="Version 1.0.6" hideArrow />
                    </div>
                </section>
            </main>
        </div>
    );
}

function SettingsItem({ icon, label, active, hideArrow }: { icon: React.ReactNode, label: string, active?: boolean, hideArrow?: boolean }) {
    return (
        <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-4">
                <div className="text-gray-400">
                    {icon}
                </div>
                <span className="font-bold text-gray-700">{label}</span>
            </div>
            {!hideArrow && (
                <div className="text-gray-300">
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
            )}
        </div>
    );
}
