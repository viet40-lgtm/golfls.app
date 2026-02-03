'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Navigation, Bell, Shield, Info, Smartphone, User, X, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { getCurrentPlayerProfile, updatePlayerProfile } from '@/app/actions/update-player';
import { recalculateAllHandicaps } from '@/app/actions/recalculate-handicaps';
import { fetchSiteConfig, saveSiteConfig } from '@/app/actions/site-config';
import { Tag, MapPin, Plus, Trash2, LogOut } from 'lucide-react';
import { getAllCourses } from '@/app/actions/get-all-courses';
import { deleteCourse } from '@/app/actions/update-course';
import ConfirmModal from '@/components/ConfirmModal';

export default function SettingsPage() {
    const [isGPSEnabled, setIsGPSEnabled] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [playerData, setPlayerData] = useState<any>(null);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
    const [siteConfig, setSiteConfig] = useState<any>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [courses, setCourses] = useState<any[]>([]);
    const [isDeletingCourse, setIsDeletingCourse] = useState<string | null>(null);

    // Custom Modal State
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

    const showConfirm = (title: string, message: string, onConfirmAction: () => void, isDestructive = false) => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirmAction();
                setConfirmConfig(null);
            },
            isDestructive,
            confirmText: 'Confirm',
            cancelText: 'Cancel'
        });
    };

    useEffect(() => {
        // Hydrate GPS pref from localStorage
        const saved = localStorage.getItem('gps_enabled_pref');
        if (saved !== null) {
            setIsGPSEnabled(saved === 'true');
        }

        const adminAccess = localStorage.getItem('admin_access');
        if (adminAccess === 'true') {
            setIsAdmin(true);
        }

        // Fetch user data
        async function loadProfile() {
            const data = await getCurrentPlayerProfile();
            if (data) setPlayerData(data);
        }
        loadProfile();

        // Fetch site config
        async function loadConfig() {
            const config = await fetchSiteConfig();
            setSiteConfig(config);
        }
        loadConfig();
        loadCourses();

        // PWA Install Prompt Listener
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    async function loadCourses() {
        const data = await getAllCourses();
        setCourses(data);
    }

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const toggleGPS = () => {
        const newValue = !isGPSEnabled;
        setIsGPSEnabled(newValue);
        localStorage.setItem('gps_enabled_pref', String(newValue));
        window.dispatchEvent(new CustomEvent('gps-pref-change', { detail: newValue }));
    };

    const handleRecalculate = async () => {
        showConfirm(
            'Recalculate Handicaps',
            'Are you sure you want to recalculate all handicaps? This will update your Index based on your full round history.',
            async () => {
                setIsRecalculating(true);
                try {
                    const result = await recalculateAllHandicaps();
                    if (result.success) {
                        showAlert('Success', result.message || 'Handicaps recalculated successfully!');
                        // Refresh local profile data too
                        const updated = await getCurrentPlayerProfile();
                        if (updated) setPlayerData(updated);
                    } else {
                        showAlert('Error', result.message || 'An error occurred.');
                    }
                } catch (err) {
                    console.error(err);
                    showAlert('Error', 'Failed to recalculate handicaps.');
                } finally {
                    setIsRecalculating(false);
                }
            }
        );
    };

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminPassword === 'Viet65+$') {
            setIsAdmin(true);
            localStorage.setItem('admin_access', 'true');
        } else {
            showAlert('Login Failed', 'Incorrect admin password');
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        showConfirm(
            'Delete Course',
            'Are you sure you want to delete this course? This action cannot be undone.',
            async () => {
                setIsDeletingCourse(courseId);
                try {
                    const result = await deleteCourse(courseId);
                    if (result.success) {
                        await loadCourses();
                    } else {
                        showAlert('Error', result.error || 'Failed to delete course');
                    }
                } catch (err) {
                    console.error(err);
                    showAlert('Error', 'An error occurred while deleting the course');
                } finally {
                    setIsDeletingCourse(null);
                }
            },
            true // destructive
        );
    };


    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-4">
            <main className="max-w-xl mx-auto p-4 space-y-6">
                {/* 1. Account Section */}
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

                {/* 2. Location Services */}
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

                {/* 3. Install App Section */}
                <section className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Install App</h2>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">Install GolfLS</h3>
                                <p className="text-sm text-gray-400 font-medium italic leading-tight mt-0.5">Add to Home Screen for the best experience</p>
                            </div>
                        </div>

                        {deferredPrompt ? (
                            <button
                                onClick={handleInstallClick}
                                className="w-full bg-black text-white py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Install App
                            </button>
                        ) : (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                <p className="text-xs text-gray-500 font-bold">
                                    App is already installed or check your browser's menu to "Add to Home Screen".
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. Administration Section */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Administration</h2>
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    setIsAdmin(false);
                                    setAdminPassword('');
                                    localStorage.removeItem('admin_access');
                                }}
                                className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Logout
                            </button>
                        )}
                    </div>
                    {!isAdmin ? (
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <form onSubmit={handleAdminLogin} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1">Admin Password</label>
                                    <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-black text-white py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-md active:scale-95 transition-all"
                                >
                                    Login to Admin
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                {/* Recalculation inside Admin */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                                                <RefreshCw className={`w-6 h-6 ${isRecalculating ? 'animate-spin' : ''}`} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight">Recalculate index and handicap</h3>
                                                <p className="text-sm text-gray-400 font-medium italic leading-tight mt-0.5">Sync your Handicap Index from round history</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRecalculate}
                                        disabled={isRecalculating}
                                        className="w-full mt-4 bg-black text-white py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isRecalculating ? 'Recalculating...' : 'Force Recalculation'}
                                    </button>
                                </div>

                                {/* Metadata inside Admin */}
                                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                    <SettingsItem
                                        icon={<Tag className="w-5 h-5" />}
                                        label="Edit Metadata"
                                        onClick={() => setIsMetadataModalOpen(true)}
                                    />
                                </div>
                            </div>

                            {/* 5. Courses Section (Now inside Admin) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Courses</h2>
                                    </div>
                                    <Link
                                        href="/settings/course/new"
                                        className="bg-black text-white px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tight flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Course
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {courses.map((course) => (
                                        <div key={course.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between group">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h3 className="font-bold text-lg leading-tight truncate">{course.name}</h3>
                                                <p className="text-xs text-gray-400 font-medium mt-0.5">
                                                    {course._count?.rounds || 0} Rounds • {course._count?.liveRounds || 0} Live
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/course/${course.id}`}
                                                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-black active:scale-95 transition-all"
                                                >
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/settings/course/${course.id}/edit`}
                                                    className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-black active:scale-95 transition-all"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteCourse(course.id)}
                                                    disabled={isDeletingCourse === course.id}
                                                    className="bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-black hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {isDeletingCourse === course.id ? '...' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {courses.length === 0 && (
                                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                                            <p className="text-gray-400 font-medium">No courses found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* 7. App Preferences Section */}
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
            {
                isProfileModalOpen && (
                    <PlayerProfileModal
                        initialData={playerData}
                        onClose={() => setIsProfileModalOpen(false)}
                        showAlert={showAlert}
                        onSave={() => {
                            setIsProfileModalOpen(false);
                            // Refresh data
                            getCurrentPlayerProfile().then(setPlayerData);
                        }}
                    />
                )
            }

            {
                isMetadataModalOpen && (
                    <MetadataModal
                        initialData={siteConfig}
                        onClose={() => setIsMetadataModalOpen(false)}
                        showAlert={showAlert}
                        onSave={() => {
                            setIsMetadataModalOpen(false);
                            // Refresh config
                            fetchSiteConfig().then(setSiteConfig);
                        }}
                    />
                )
            }

            {/* Custom Confirm Modal */}
            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                    isDestructive={confirmConfig.isDestructive}
                    confirmText={confirmConfig.confirmText}
                    cancelText={confirmConfig.cancelText}
                    hideCancel={confirmConfig.hideCancel}
                />
            )}
        </div >
    );
}

function PlayerProfileModal({ initialData, onClose, onSave, showAlert }: { initialData: any, onClose: () => void, onSave: () => void, showAlert: (t: string, m: string) => void }) {
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
            showAlert('Update Failed', 'Failed to update profile');
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
                            <p className="text-[12pt] font-medium leading-tight">After 5 recorded rounds, your index and handicap will automatically follow official USGA rules.</p>
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
                        <div className="flex items-start gap-2 text-zinc-400 italic">
                            <div className="w-1 h-1 rounded-full bg-zinc-300 mt-2" />
                            <p className="text-[12pt] font-medium leading-tight">Requires at least 4 characters</p>
                        </div>
                        <div className="flex items-start gap-2 text-zinc-400 italic">
                            <div className="w-1 h-1 rounded-full bg-zinc-300 mt-2" />
                            <p className="text-[12pt] font-medium leading-tight">Leave blank to maintain your current password</p>
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


function MetadataModal({ initialData, onClose, onSave, showAlert }: { initialData: any, onClose: () => void, onSave: () => void, showAlert: (t: string, m: string) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        keywords: initialData?.keywords || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await saveSiteConfig(formData);
            onSave();
        } catch (err) {
            console.error(err);
            showAlert('Update Failed', 'Failed to update metadata');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md">
                <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors" title="Close">
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-black italic uppercase tracking-tighter">Edit Metadata</h2>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                <div className="max-w-xl mx-auto space-y-6">
                    <div className="space-y-4">
                        <ProfileInput
                            label="Site Title"
                            value={formData.title}
                            onChange={v => setFormData({ ...formData, title: v })}
                            placeholder="e.g. Golf Live Scores"
                            required
                        />
                        <div className="space-y-1.5 flex-1">
                            <label className="text-[10pt] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Site description for SEO..."
                                className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-lg min-h-[120px]"
                                required
                            />
                        </div>
                        <ProfileInput
                            label="Keywords"
                            value={formData.keywords}
                            onChange={v => setFormData({ ...formData, keywords: v })}
                            placeholder="golf, scorecard, live..."
                        />
                    </div>
                </div>
            </form>

            {/* Bottom Bar */}
            <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <div className="max-w-xl mx-auto">
                    <button
                        type="submit"
                        disabled={isLoading}
                        onClick={handleSubmit}
                        className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Save Metadata"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Save Changes
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
