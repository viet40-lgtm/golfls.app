'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { login, signup, forgotPassword } from '@/app/actions/auth'
import { systemCheck } from '@/app/actions/system-check'
import { Dna, Phone, Lock, User, Mail, Calendar, Trophy, ChevronRight, ArrowLeft, Hash } from 'lucide-react'

type AuthMode = 'signin' | 'signup' | 'forgot-password'

function SubmitButton({ mode }: { mode: AuthMode }) {
    const { pending } = useFormStatus()
    const getLabel = () => {
        if (mode === 'signin') return 'Sign In'
        if (mode === 'signup') return 'Create Account'
        return 'Send Reset Link'
    }

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#1a4d2e] text-white font-bold text-xl py-4 rounded-2xl hover:bg-[#143d24] transition-all transform active:scale-[0.98] disabled:opacity-50 mt-6 uppercase tracking-wider shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
        >
            {pending ? 'Processing...' : (
                <>
                    {getLabel()}
                    <ChevronRight size={24} />
                </>
            )}
        </button>
    )
}

export default function AuthLanding() {
    const [mode, setMode] = useState<AuthMode>('signin')
    const [error, setError] = useState<string | null>(null)
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [firstName, setFirstName] = useState<string>('')
    const [lastName, setLastName] = useState<string>('')
    const [phone, setPhone] = useState<string>('')
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null)

    // Derived Player ID for preview
    const playerIdPreview = (firstName && phone.length >= 4)
        ? `${firstName.charAt(0).toUpperCase()}${phone.replace(/\D/g, '').slice(-4)}`
        : '...'

    useEffect(() => {
        // Test Server Connectivity on Mount
        systemCheck()
            .then(res => console.log("PRODUCTION DEBUG - System Check:", res))
            .catch(err => console.error("PRODUCTION DEBUG - System Check Error:", err));

        // Load saved email and password
        const savedEmail = localStorage.getItem('last_login_email')
        const savedPassword = localStorage.getItem('last_login_password')
        if (savedEmail) setEmail(savedEmail)
        if (savedPassword) setPassword(savedPassword)
    }, []);

    async function handleSubmit(formData: FormData) {
        setError(null)
        setForgotPasswordMessage(null)

        if (mode === 'forgot-password') {
            try {
                const result = await forgotPassword(null, formData)
                if (result?.error) {
                    setError(result.error)
                } else if (result?.success) {
                    setForgotPasswordMessage(result.message || 'Reset link sent. Check your email.')
                }
            } catch (e) {
                setError('An unexpected error occurred')
            }
            return
        }

        const action = mode === 'signin' ? login : signup

        try {
            const result = await action(null, formData)
            // Fix TS lint: Check if 'error' exists first
            if (result && 'error' in result && result.error) {
                setError(result.error)

                // Check if 'email' exists in the result (it does for login error)
                if ('email' in result && result.email) {
                    // We don't really need to set it here if it's already in state, 
                    // but we could ensures it syncs if the server transformed it.
                    // For now, let's just leave the user's input as is.
                }
            } else if (result && 'success' in result && result.success) {
                window.location.reload() // Refresh to update session state
            }
        } catch (e) {
            console.error("Auth Error:", e);
            setError('An unexpected error occurred: ' + (e instanceof Error ? e.message : String(e)))
        }
    }

    return (
        <div className="min-h-screen bg-[#2e7d32] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

                {/* Brand Side - Hidden on mobile, shown on desktop */}
                <div className="hidden lg:flex flex-col text-white space-y-8 pr-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <span role="img" aria-label="golf" className="text-2xl">⛳</span>
                            <span className="font-bold tracking-tight text-xl">GolfLS.app</span>
                        </div>
                        <h1 className="text-6xl font-black leading-tight drop-shadow-2xl">
                            Master Your Game <br />
                            <span className="text-green-300">In Real-Time.</span>
                        </h1>
                        <p className="text-xl text-green-50/90 max-w-lg leading-relaxed font-medium">
                            Join the community of golfers tracking live scores, managing handicaps, and competing across Greater New Orleans.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                            <div className="text-green-300 mb-3"><Trophy size={32} /></div>
                            <h3 className="font-bold text-lg mb-1">Live Tracking</h3>
                            <p className="text-sm text-green-50/70">Real-time leaderboard updates for every hole.</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                            <div className="text-green-300 mb-3"><Dna size={32} /></div>
                            <h3 className="font-bold text-lg mb-1">Dna Stats</h3>
                            <p className="text-sm text-green-50/70">Advanced physical and performance analytics.</p>
                        </div>
                    </div>
                </div>

                {/* Auth Card Side */}
                <div className="flex flex-col items-center">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative p-8 sm:p-10 border border-white/20">
                        <div className="flex flex-col items-center">
                            <div className="lg:hidden mb-6 flex flex-col items-center">
                                <div className="text-[#1a4d2e] flex items-center gap-2 mb-2">
                                    <span role="img" aria-label="golf" className="text-3xl">⛳</span>
                                    <span className="font-bold tracking-tight text-2xl">GolfLS.app</span>
                                </div>
                            </div>


                            <h1 className="text-4xl font-black text-black mb-8 text-center italic tracking-tight">
                                {mode === 'signin' ? 'WELCOME BACK' : mode === 'signup' ? (
                                    <>
                                        GET STARTED <span className="text-[#2e7d32]">ID: {playerIdPreview}</span>
                                    </>
                                ) : 'RESET PASSWORD'}
                            </h1>

                            <form action={handleSubmit} className="w-full space-y-5">
                                {mode === 'forgot-password' ? (
                                    <div className="space-y-4">
                                        <p className="text-center text-gray-500 text-sm font-medium">
                                            Enter your email address and we'll send you a link to reset your password.
                                        </p>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                <input
                                                    name="email"
                                                    type="email"
                                                    placeholder="john@example.com"
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {mode === 'signup' && (
                                            <>
                                                {/* 1. Name */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">First Name</label>
                                                        <div className="relative">
                                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                            <input
                                                                id="firstName"
                                                                name="firstName"
                                                                type="text"
                                                                placeholder="John"
                                                                value={firstName}
                                                                onChange={(e) => setFirstName(e.target.value)}
                                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Last Name</label>
                                                        <div className="relative">
                                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                            <input
                                                                id="lastName"
                                                                name="lastName"
                                                                type="text"
                                                                placeholder="Doe"
                                                                value={lastName}
                                                                onChange={(e) => setLastName(e.target.value)}
                                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. Phone */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                        <input
                                                            id="phone"
                                                            name="phone"
                                                            type="tel"
                                                            placeholder="(555) 555-5555"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* 3. Password (for signup) OR Email/ID + Password (for signin) */}
                                        {mode === 'signin' && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                                    Email Address or Player ID
                                                </label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                    <input
                                                        id="identifier"
                                                        name="identifier"
                                                        type="text"
                                                        value={email}
                                                        onChange={(e) => {
                                                            setEmail(e.target.value)
                                                            localStorage.setItem('last_login_email', e.target.value)
                                                        }}
                                                        placeholder="john@example.com or ID"
                                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    {mode === 'signup' ? 'Create PIN / Password' : 'Password'}
                                                </label>
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {mode === 'signup' && (
                                            <>
                                                {/* 4. Email */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                        <input
                                                            id="email"
                                                            name="email"
                                                            type="email"
                                                            placeholder="john@example.com"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* 5. Preferred Tee Box */}
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="preferredTeeBox" className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Preferred Tee</label>
                                                        <div className="relative">
                                                            <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                            <select
                                                                id="preferredTeeBox"
                                                                name="preferredTeeBox"
                                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium appearance-none cursor-pointer"
                                                            >
                                                                <option value="">Select</option>
                                                                <option value="Black">Black</option>
                                                                <option value="Blue">Blue</option>
                                                                <option value="White">White</option>
                                                                <option value="Gold">Gold</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* 6. Handicap Index */}
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="handicapIndex" className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Index #</label>
                                                        <div className="relative">
                                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                                            <input
                                                                id="handicapIndex"
                                                                name="handicapIndex"
                                                                type="number"
                                                                step="0.1"
                                                                placeholder="e.g. 5.4"
                                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-400 text-center">
                                                    Index and Handicap will be calculated after 5th rounds.
                                                </p>
                                            </>
                                        )}

                                        {error && (
                                            <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold text-center border border-red-100 animate-in shake duration-300">
                                                {error}
                                            </div>
                                        )}

                                        {forgotPasswordMessage && (
                                            <div className="p-4 rounded-2xl bg-green-50 text-green-700 text-sm font-bold text-center border border-green-100 animate-in zoom-in duration-300">
                                                {forgotPasswordMessage}
                                            </div>
                                        )}

                                        <SubmitButton mode={mode} />
                                    </>
                                )}
                            </form>

                            <div className="mt-8 text-center">
                                {mode === 'forgot-password' ? (
                                    <button
                                        onClick={() => {
                                            setMode('signin')
                                            setError(null)
                                            setForgotPasswordMessage(null)
                                        }}
                                        className="text-gray-500 font-bold hover:text-black flex items-center gap-2 mx-auto transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to Sign In
                                    </button>
                                ) : (
                                    <>
                                        <p className="text-gray-500 font-medium mb-2">
                                            {mode === 'signin' ? "Not a member yet?" : "Already have an account?"}
                                        </p>
                                        <div className="flex flex-col items-center gap-4">
                                            <button
                                                onClick={() => {
                                                    setMode(mode === 'signin' ? 'signup' : 'signin')
                                                    setError(null)
                                                }}
                                                className="text-[#1a4d2e] font-black text-lg hover:underline underline-offset-4 decoration-2"
                                            >
                                                {mode === 'signin' ? 'CREATE AN ACCOUNT' : 'SIGN IN TO YOURS'}
                                            </button>

                                            {mode === 'signin' && (
                                                <button
                                                    onClick={() => {
                                                        setMode('forgot-password')
                                                        setError(null)
                                                    }}
                                                    className="text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
                                                >
                                                    Forgot your password?
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Secondary Footer Info */}
                    <p className="mt-8 text-white/50 text-xs font-bold uppercase tracking-widest text-center">
                        &copy; 2026 GolfLS.app &bull; All Rights Reserved
                    </p>
                </div>

            </div>
        </div>
    )
}
