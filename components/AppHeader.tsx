'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout, verifyAdminPassword, adminLogout } from '@/app/actions/auth';
import { Menu, X, Shield, LogOut, Home, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AppHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    useEffect(() => {
        const checkAdmin = () => {
            const adminCookie = Cookies.get('admin_session');
            const adminStorage = typeof window !== 'undefined' ? localStorage.getItem('admin_access') : null;
            const isReallyAdmin = adminCookie === 'true' || adminStorage === 'true';
            setIsAdmin(isReallyAdmin);
        };

        checkAdmin();
        window.addEventListener('admin-change', checkAdmin);

        const authStatus = Cookies.get('auth_status');
        const isAuth = authStatus === 'true';
        setIsAuthenticated(isAuth);

        return () => window.removeEventListener('admin-change', checkAdmin);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen && !(event.target as Element).closest('.menu-container')) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    const handleAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await verifyAdminPassword(passwordInput);
        if (result.success) {
            setIsAdmin(true);
            setShowLoginModal(false);
            window.location.reload();
        } else {
            alert(result.error || 'Incorrect password');
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 px-1 py-1">
                <div className="w-full mx-auto bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-none p-1 flex justify-between items-center transition-all duration-300">
                    {/* Left: Logo */}
                    <Link href={isAuthenticated ? '/live' : '/'} className="flex items-center gap-2 group transition-all">
                        <div className="bg-black text-white p-1 rounded-lg group-hover:scale-110 transition-transform">
                            <img src="/icon-192.png" alt="GolfLS" className="w-8 h-8 object-contain rounded" />
                        </div>
                        <span className="font-extrabold text-xl tracking-tight text-black">GolfLS.app</span>
                    </Link>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <div className="bg-red-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-lg border-2 border-red-500 shadow-sm" title="Admin Mode Active">
                                A
                            </div>
                        )}
                        {isAuthenticated && (
                            <div className="relative menu-container">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 bg-black text-white border border-black p-1 rounded-xl text-xs font-black transition-all active:scale-95 hover:bg-zinc-800 uppercase tracking-widest"
                                >
                                    <Menu className="w-4 h-4" />
                                    <span>Menu</span>
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute top-[calc(100%+12px)] right-[-4px] w-[calc(100vw-16px)] max-w-none bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-black overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="p-3 space-y-2">
                                            <MenuLink
                                                href={isAuthenticated ? "/live" : "/"}
                                                icon={<Home className="w-8 h-8" />}
                                                label={isAuthenticated ? "Live Scoring" : "Home"}
                                                onClick={() => setIsMenuOpen(false)}
                                                isActive={pathname === (isAuthenticated ? "/live" : "/")}
                                            />
                                            <MenuLink
                                                href="/settings"
                                                icon={<Settings className="w-8 h-8" />}
                                                label="Settings"
                                                onClick={() => setIsMenuOpen(false)}
                                                isActive={pathname === "/settings"}
                                            />
                                            <div className="h-[2px] bg-black my-2 mx-2"></div>
                                            <button
                                                onClick={async () => {
                                                    setIsMenuOpen(false);
                                                    if (isAdmin) await adminLogout();
                                                    else await logout();
                                                    window.location.href = '/';
                                                }}
                                                className="w-full flex items-center gap-5 px-6 py-6 hover:bg-red-50 text-red-600 font-extrabold rounded-xl transition-colors text-[18pt]"
                                            >
                                                <LogOut className="w-8 h-8" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isAuthenticated && !isAdmin && (
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="p-2 text-gray-400 hover:text-black transition-colors"
                                title="Admin"
                            >
                                <Shield className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </header >

            {/* Admin Login Modal */}
            {
                showLoginModal && (
                    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="w-full h-full flex flex-col justify-center max-w-none">
                            <div className="flex justify-between items-center mb-6 absolute top-4 right-4 left-4">
                                <h3 className="font-extrabold text-2xl">Admin Access</h3>
                                <button onClick={() => setShowLoginModal(false)} aria-label="Close" className="text-gray-400 hover:text-black transition-colors p-2 bg-gray-100 rounded-full">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="w-full max-w-md mx-auto px-4">
                                <form onSubmit={handleAdminSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Password</label>
                                        <input
                                            type="password"
                                            autoFocus
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            className="w-full px-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none text-base font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-black text-white hover:bg-gray-900 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        Verify Identity
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}

function MenuLink({ href, icon, label, onClick, isActive }: { href: string; icon: React.ReactNode; label: string; onClick: () => void; isActive?: boolean }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-4 px-6 py-5 font-extrabold rounded-xl transition-colors text-[18pt] ${isActive
                ? 'bg-blue-50 text-blue-600 border-2 border-blue-200'
                : 'text-black hover:bg-gray-50'
                }`}
        >
            <span className={isActive ? 'text-blue-500' : 'text-gray-400'}>{icon}</span>
            {label}
        </Link>
    );
}
