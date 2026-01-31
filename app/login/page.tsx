'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Mail, Lock, ChevronRight, Flag, Loader2, User, Phone } from 'lucide-react'

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        const formData = new FormData(e.currentTarget)
        try {
            let result: { success: boolean, error?: string, message?: string } | undefined;
            if (mode === 'login') {
                result = await login(formData) as any
            } else {
                result = await signup(formData) as any
            }

            if (result && !result.success) {
                setError(result.error || 'An error occurred during authentication')
                setLoading(false)
            } else if (result?.success && result.message) {
                setSuccessMessage(result.message)
                setLoading(false)
            }
        } catch (err: any) {
            if (err.digest?.startsWith('NEXT_REDIRECT')) throw err;
            setError(err.message || 'An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-[#2b7a3a] p-6 font-sans">
            <div className="bg-white w-full max-w-[440px] rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col items-center mb-8 text-black">
                {/* Logo Section */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-[#2b7a3a] text-white p-2 rounded-full flex items-center justify-center">
                        <Flag size={20} fill="currentColor" />
                    </div>
                    <span className="text-2xl font-bold text-[#1b4332] tracking-tighter uppercase italic">GolfLS</span>
                </div>

                {/* Welcome Title */}
                <h1 className="text-4xl font-black italic tracking-tighter text-black uppercase mb-10 text-center">
                    {mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
                </h1>

                {error && (
                    <div className="w-full bg-red-50 text-red-600 text-sm font-semibold p-4 rounded-xl text-center mb-6 border border-red-100 italic">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="w-full bg-green-50 text-green-700 text-sm font-semibold p-4 rounded-xl text-center mb-6 border border-green-100 italic">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    {mode === 'signup' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">First Name</label>
                                    <div className="relative flex items-center">
                                        <input
                                            className="w-full bg-zinc-50 border-transparent focus:border-[#2b7a3a] focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-2xl py-4 px-6 text-sm font-medium text-zinc-900 transition-all outline-none border hover:border-zinc-200"
                                            type="text"
                                            name="firstName"
                                            placeholder="John"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Last Name</label>
                                    <div className="relative flex items-center">
                                        <input
                                            className="w-full bg-zinc-50 border-transparent focus:border-[#2b7a3a] focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-2xl py-4 px-6 text-sm font-medium text-zinc-900 transition-all outline-none border hover:border-zinc-200"
                                            type="text"
                                            name="lastName"
                                            placeholder="Doe"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Phone Number</label>
                                <div className="relative flex items-center">
                                    <input
                                        className="w-full bg-zinc-50 border-transparent focus:border-[#2b7a3a] focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-2xl py-4 px-6 text-sm font-medium text-zinc-900 transition-all outline-none border hover:border-zinc-200"
                                        type="tel"
                                        name="phone"
                                        placeholder="(555) 555-5555"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email/ID Field */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">
                            {mode === 'login' ? 'Email Address or Player ID' : 'Email Address'}
                        </label>
                        <div className="relative flex items-center">
                            <input
                                className="w-full bg-zinc-50 border-transparent focus:border-[#2b7a3a] focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-2xl py-4 px-6 text-sm font-medium text-zinc-900 transition-all outline-none border hover:border-zinc-200 text-left"
                                type={mode === 'login' ? 'text' : 'email'}
                                name="email"
                                placeholder={mode === 'login' ? 'Enter email or player ID' : 'name@example.com'}
                                required
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Password or PIN</label>
                        <div className="relative flex items-center">
                            <input
                                className="w-full bg-zinc-50 border-transparent focus:border-[#2b7a3a] focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-2xl py-4 px-6 text-sm font-medium text-zinc-900 transition-all outline-none border hover:border-zinc-200 text-left"
                                type="password"
                                name="password"
                                placeholder="••••"
                                required
                                minLength={4}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        className="w-full bg-[#1b4332] hover:bg-[#153427] text-white rounded-[20px] py-4 px-6 text-lg font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 shadow-lg active:scale-95 disabled:opacity-70 disabled:pointer-events-none uppercase tracking-tight mt-4"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                {mode === 'login' ? 'Sign In' : 'Sign Up'}
                                <ChevronRight size={24} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 text-center space-y-4">
                    <p className="text-sm text-zinc-500 font-medium">
                        {mode === 'login' ? (
                            <>
                                Not a member yet?
                                <button className="ml-1.5 text-[#1b4332] font-black hover:underline uppercase text-xs tracking-wider" onClick={() => setMode('signup')}>
                                    Create An Account
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?
                                <button className="ml-1.5 text-[#1b4332] font-black hover:underline uppercase text-xs tracking-wider" onClick={() => setMode('login')}>
                                    Sign In
                                </button>
                            </>
                        )}
                    </p>
                    <button className="block w-full text-zinc-400 font-bold text-xs uppercase tracking-widest hover:text-zinc-600 transition-colors">
                        Forgot your password?
                    </button>
                </div>
            </div>

            {/* Copyright Footer */}
            <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
                © 2026 GOLFLS.APP • ALL RIGHTS RESERVED
            </div>
        </main>
    );
}

