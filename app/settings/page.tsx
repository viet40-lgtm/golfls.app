'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Navigation, Bell, Shield, Info, Smartphone, User, X, Check, Eye, EyeOff } from 'lucide-react';
import { getCurrentPlayerProfile, updatePlayerProfile } from '@/app/actions/update-player';

export default function SettingsPage() {
    const [isGPSEnabled, setIsGPSEnabled] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [playerData, setPlayerData] = useState<any>(null);

    useEffect(() => {
        // Hydrate GPS pref from localStorage
        const saved = localStorage.getItem('gps_enabled_pref');
        if (saved !== null) {
            setIsGPSEnabled(saved === 'true');
        }

        // Fetch user data
        async function loadProfile() {
            const data = await getCurrentPlayerProfile();
            if (data) setPlayerData(data);
        }
        loadProfile();
    }, []);

    const toggleGPS = () => {
        const newValue = !isGPSEnabled;
        setIsGPSEnabled(newValue);
        localStorage.setItem('gps_enabled_pref', String(newValue));
        window.dispatchEvent(new CustomEvent('gps-pref-change', { detail: newValue }));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-4">
            <main className="max-w-xl mx-auto p-4 space-y-6">
                {/* Account Section */}
                <section className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Account</h2>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <SettingsItem
                            icon={<User className="w-5 h-5" />}
                            label="Player Profile"
                            onClick={() => setIsProfileModalOpen(true)}
                        />
                    </div>
                </section>

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

                {/* Other Sections */}
                <section className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">App Preferences</h2>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <SettingsItem icon={<Bell className="w-5 h-5" />} label="Notifications" />
                        <SettingsItem icon={<Shield className="w-5 h-5" />} label="Privacy & Security" />
                        <SettingsItem icon={<Info className="w-5 h-5" />} label="Version 1.0.6" hideArrow />
                    </div>
                </section>
            </main>

            {/* Profile Fullscreen Modal */}
            {isProfileModalOpen && (
                <PlayerProfileModal
                    initialData={playerData}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSave={() => {
                        setIsProfileModalOpen(false);
                        // Refresh data
                        getCurrentPlayerProfile().then(setPlayerData);
                    }}
                />
            )}
        </div>
    );
}

function PlayerProfileModal({ initialData, onClose, onSave }: { initialData: any, onClose: () => void, onSave: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        firstName: initialData?.name?.split(' ')[0] || '',
        lastName: initialData?.name?.split(' ').slice(1).join(' ') || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        password: '',
        handicapIndex: initialData?.handicapIndex?.toString() || '0',
        estimateHandicap: initialData?.estimateHandicap?.toString() || '0',
        preferredTeeBox: initialData?.preferredTeeBox || 'White'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const fd = new FormData();
        fd.append('id', initialData.id);
        fd.append('firstName', formData.firstName.trim());
        fd.append('lastName', formData.lastName.trim());
        fd.append('email', formData.email.trim());
        fd.append('phone', formData.phone.trim());
        fd.append('handicapIndex', formData.handicapIndex);
        fd.append('estimateHandicap', formData.estimateHandicap);
        fd.append('preferredTeeBox', formData.preferredTeeBox);
        if (formData.password) fd.append('password', formData.password);

        const result = await updatePlayerProfile(fd);
        setIsLoading(false);

        if (result.success) {
            onSave();
        } else {
            alert('Failed to update profile');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md">
                <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Close">
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-black italic uppercase tracking-tighter">Edit Profile</h2>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                <div className="max-w-xl mx-auto space-y-6">
                    {/* Name Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <ProfileInput
                            label="First Name"
                            value={formData.firstName}
                            onChange={v => setFormData({ ...formData, firstName: v })}
                            required
                        />
                        <ProfileInput
                            label="Last Name"
                            value={formData.lastName}
                            onChange={v => setFormData({ ...formData, lastName: v })}
                            required
                        />
                    </div>

                    {/* Contact info */}
                    <div className="space-y-4">
                        <ProfileInput
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={v => setFormData({ ...formData, email: v })}
                        />
                        <ProfileInput
                            label="Phone"
                            type="tel"
                            value={formData.phone}
                            onChange={v => setFormData({ ...formData, phone: v })}
                        />
                    </div>

                    {/* Golf specific */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <ProfileInput
                                label="Index"
                                type="number"
                                step="0.1"
                                value={formData.handicapIndex}
                                onChange={v => setFormData({ ...formData, handicapIndex: v })}
                            />
                            <ProfileInput
                                label="Estimate Handicap"
                                type="number"
                                value={formData.estimateHandicap}
                                onChange={v => setFormData({ ...formData, estimateHandicap: v })}
                            />
                        </div>
                        <div className="flex items-start gap-2 px-1 text-zinc-400 italic">
                            <p className="text-[10pt] font-medium leading-tight">After 5 recorded rounds, your index and handicap will automatically follow official USGA rules.</p>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="pref-tee-box" className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1">Prefer Tee Box</label>
                            <select
                                id="pref-tee-box"
                                className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                                value={formData.preferredTeeBox}
                                onChange={e => setFormData({ ...formData, preferredTeeBox: e.target.value })}
                                title="Preferred Tee Box"
                            >
                                <option value="White">White</option>
                                <option value="Blue">Blue</option>
                                <option value="Gold">Gold</option>
                                <option value="Red">Red</option>
                                <option value="Black">Black</option>
                            </select>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-1.5 relative">
                        <ProfileInput
                            label="New Password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={v => setFormData({ ...formData, password: v })}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 bottom-4 p-1 text-gray-300 hover:text-black transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Help text */}
                    <div className="space-y-2 px-1">
                        <div className="flex items-center gap-2 text-zinc-400 uppercase tracking-tighter">
                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                            <p className="text-xs font-black">Requires at least 4 characters</p>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 italic tracking-tight">
                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                            <p className="text-xs font-bold">Leave blank to maintain your current password</p>
                        </div>
                    </div>
                </div>
            </form>

            {/* Bottom Bar */}
            <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <div className="max-w-xl mx-auto">
                    <button
                        type="submit"
                        disabled={isLoading || !initialData}
                        onClick={handleSubmit}
                        className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Save Profile"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Save Profile
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProfileInput({ label, value, onChange, type = "text", placeholder, required, step }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string, required?: boolean, step?: string }) {
    return (
        <div className="space-y-1.5 flex-1">
            <label className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                step={step}
                required={required}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                title={label}
            />
        </div>
    );
}

function SettingsItem({ icon, label, onClick, hideArrow }: { icon: React.ReactNode, label: string, onClick?: () => void, hideArrow?: boolean }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
        >
            <div className="flex items-center gap-4">
                <div className="text-gray-400">
                    {icon}
                </div>
                <span className="font-bold text-gray-700 text-lg">{label}</span>
            </div>
            {!hideArrow && (
                <div className="text-gray-300">
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
            )}
        </div>
    );
}
