'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout, verifyAdminPassword, adminLogout } from '@/app/actions/auth';
import { Menu, X, Shield, LogOut, Home, Settings, User } from 'lucide-react';

export default function AppHeader({ playerId }: { playerId?: string | null }) {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [fallbackPlayerId, setFallbackPlayerId] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const session = Cookies.get('admin_session');
        setIsAdmin(session === 'true');

        const authStatus = Cookies.get('auth_status');
        const isAuth = authStatus === 'true';
        setIsAuthenticated(isAuth);

        if (isAuth && !playerId) {
            fetch('/api/user/player-id')
                .then(res => res.json())
                .then(data => {
                    if (data.playerId) {
                        setFallbackPlayerId(data.playerId);
                    }
                })
                .catch(err => console.error('Failed to fetch playerId:', err));
        }
    }, [playerId]);

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
                <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-none p-1 flex justify-between items-center transition-all duration-300">
                    {/* Left: Logo */}
                    <Link href={isAuthenticated ? '/live' : '/'} className="flex items-center gap-2 group transition-all">
                        <div className="bg-black text-white p-1 rounded-lg group-hover:scale-110 transition-transform">
                            <img src="/icon-192.png" alt="GolfLS" className="w-8 h-8 object-contain rounded" />
                        </div>
                        <span className="font-extrabold text-xl tracking-tight text-black">GolfLS.app</span>
                    </Link>

                    {/* Center: Player ID (Visible if logged in) */}
                    <div className="hidden sm:flex items-center">
                        {(playerId || fallbackPlayerId) && (
                            <div className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-sm font-bold text-gray-700">
                                    {playerId || fallbackPlayerId}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {!isAuthenticated ? (
                            <Link
                                href="/login"
                                className="bg-black text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-md"
                            >
                                Sign In
                            </Link>
                        ) : (
                            <div className="relative menu-container">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 bg-black text-white border border-black p-1 rounded-xl text-xs font-black transition-all active:scale-95 hover:bg-zinc-800 uppercase tracking-widest"
                                >
                                    <Menu className="w-4 h-4" />
                                    <span>Menu</span>
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-2 space-y-1">
                                            <MenuLink
                                                href={isAuthenticated ? "/live" : "/"}
                                                icon={<Home className="w-4 h-4" />}
                                                label={isAuthenticated ? "Live Round" : "Home"}
                                                onClick={() => setIsMenuOpen(false)}
                                            />
                                            <MenuLink href="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" onClick={() => setIsMenuOpen(false)} />
                                            <div className="h-px bg-gray-50 my-2 mx-2"></div>
                                            <button
                                                onClick={async () => {
                                                    setIsMenuOpen(false);
                                                    if (isAdmin) await adminLogout();
                                                    else await logout();
                                                    window.location.href = '/login';
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 font-bold rounded-xl transition-colors text-sm"
                                            >
                                                <LogOut className="w-4 h-4" />
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
                    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-gray-100 animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-extrabold text-2xl">Admin Access</h3>
                                <button onClick={() => setShowLoginModal(false)} aria-label="Close" className="text-gray-400 hover:text-black transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
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
                )
            }
        </>
    );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 font-bold rounded-xl transition-colors text-sm text-gray-700"
        >
            <span className="text-gray-400">{icon}</span>
            {label}
        </Link>
    );
}
