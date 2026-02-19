'use client'

import { useState } from 'react'
import { login, signup, forgotPassword } from '@/app/actions/auth'
import { ChevronRight, Loader2 } from 'lucide-react'

export default function LoginForm({ initialEmail, initialPassword }: { initialEmail?: string, initialPassword?: string }) {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
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
            let result: { success?: boolean, error?: string, message?: string } | undefined;

            if (mode === 'login') {
                result = await login(null, formData)
            } else if (mode === 'signup') {
                result = await signup(null, formData)
            } else if (mode === 'forgot') {
                result = await forgotPassword(null, formData)
            }

            if (result && result.error) {
                setError(result.error)
                setLoading(false)
            } else if (result?.success) {
                if (mode === 'forgot') {
                    setSuccessMessage(result.message || 'Check your email for reset instructions.')
                    setLoading(false)
                } else {
                    window.location.href = '/live'
                }
            } else {
                setError('An unexpected response occurred.')
                setLoading(false)
            }
        } catch (err: any) {
            console.error('Auth error:', err)
            setError('A system error occurred. Please try again.')
            setLoading(false)
        }
    }

    const labelClass = "block text-[15pt] font-bold text-[#888] uppercase tracking-[0.05em] mb-1"
    const inputClass = "w-full bg-[#f8f9fa] border border-transparent rounded-[14px] px-4 py-1 text-[15pt] text-[#333]"
    const linkBtnClass = "bg-transparent border-none text-[#1b4332] font-extrabold uppercase cursor-pointer p-0 ml-1"

    return (
        <main
            className="min-h-screen flex flex-col items-center justify-start bg-[#2b7a3a] py-8 px-3 font-sans"
            suppressHydrationWarning
        >
            {/* Card */}
            <div className="bg-white w-full max-w-[440px] rounded-[24px] px-4 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col items-center mb-8">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-3">
                    <img src="/icon-192.png" alt="GolfLS" className="w-9 h-9 object-contain rounded-[10px]" />
                    <span className="text-[1.4rem] font-bold text-[#1b4332] tracking-normal">GolfLS.app</span>
                </div>

                {/* Title */}
                <h1 className="text-[18pt] font-black italic text-[#111] uppercase mb-2 py-1 text-center tracking-[-0.01em]">
                    {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'}
                </h1>

                {/* Error Message */}
                {error && (
                    <div className="text-[#dc3545] text-sm font-semibold mb-6 text-center w-full p-3 bg-[#fff5f5] rounded-xl">
                        {error}
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div className="text-[#28a745] text-sm font-semibold mb-6 text-center w-full p-3 bg-[#f8fff8] rounded-xl break-all">
                        {successMessage.includes('http') ? (
                            <>
                                {successMessage.split('http')[0]}
                                <a
                                    href={'http' + successMessage.split('http')[1]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1b4332] underline block mt-2 font-extrabold"
                                >
                                    CLICK HERE TO RESET
                                </a>
                            </>
                        ) : (
                            successMessage
                        )}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full">
                    {/* Signup Extra Fields */}
                    {mode === 'signup' && (
                        <>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <div>
                                    <label className={labelClass}>First Name</label>
                                    <input className={inputClass} type="text" name="firstName" placeholder="John" required />
                                </div>
                                <div>
                                    <label className={labelClass}>Last Name</label>
                                    <input className={inputClass} type="text" name="lastName" placeholder="Doe" required />
                                </div>
                            </div>
                            <div className="mb-2">
                                <label className={labelClass}>Phone Number</label>
                                <input className={inputClass} type="tel" name="phone" placeholder="(555) 555-5555" required />
                            </div>
                            <div className="mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className={labelClass}>Index</label>
                                        <input className={inputClass} type="number" step="0.1" name="handicapIndex" placeholder="0.0" defaultValue="0.0" />
                                    </div>
                                    <div className="text-[15pt] font-extrabold text-[#ced4da] mt-5">OR</div>
                                    <div className="flex-1">
                                        <label className={labelClass}>Handicap</label>
                                        <input className={inputClass} type="number" name="estimateHandicap" placeholder="0" defaultValue="0" />
                                    </div>
                                </div>
                                <p className="text-[15pt] text-[#999] mt-1 italic leading-tight">
                                    (Index and Handicap will be calculated base on the USGA rules, after 5 rounds.)
                                </p>
                            </div>
                        </>
                    )}

                    {/* Email */}
                    <div className="mb-2">
                        <label className={labelClass}>Email Address</label>
                        <input
                            className={inputClass}
                            type="email"
                            name="email"
                            placeholder="name@example.com"
                            defaultValue={initialEmail}
                            required
                        />
                    </div>

                    {/* Password */}
                    {mode !== 'forgot' && (
                        <div className="mb-2">
                            <label className={labelClass}>Password</label>
                            <input
                                className={inputClass}
                                type="password"
                                name="password"
                                placeholder="••••"
                                defaultValue={initialPassword}
                                required
                                minLength={4}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-[#1b4332] text-white border-none rounded-2xl p-4 text-base font-bold flex items-center justify-center gap-3 mt-4 shadow-[0_10px_20px_rgba(27,67,50,0.2)] uppercase ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                {mode === 'login' ? 'LOG IN' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                                <ChevronRight size={24} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 text-center text-[#555] text-[15pt]">
                    {mode === 'login' ? (
                        <>
                            Not a member yet?
                            <button onClick={() => setMode('signup')} className={linkBtnClass}>
                                CREATE AN ACCOUNT
                            </button>
                            <button onClick={() => setMode('forgot')} className="bg-transparent border-none block w-full mt-6 text-[#adb5bd] no-underline font-medium text-[15pt] cursor-pointer">
                                Forgot your password?
                            </button>
                        </>
                    ) : mode === 'signup' ? (
                        <>
                            Already have an account?
                            <button onClick={() => setMode('login')} className={linkBtnClass}>
                                LOG IN
                            </button>
                        </>
                    ) : (
                        <>
                            Remember your password?
                            <button onClick={() => setMode('login')} className={linkBtnClass}>
                                LOG IN
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Copyright */}
            <div className="text-white/60 text-xs font-bold uppercase tracking-widest">
                © 2026 GOLFLS.APP • ALL RIGHTS RESERVED
            </div>
        </main>
    )
}
