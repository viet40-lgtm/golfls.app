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

    const labelClass = "block text-2xl font-bold text-gray-400 uppercase tracking-widest mb-0.5";
    const inputClass = "w-full bg-slate-50 border border-transparent rounded-2xl px-4 py-1 text-2xl text-gray-800 box-border";
    const linkBtnClass = "bg-transparent border-none text-golf-DEFAULT font-extrabold uppercase cursor-pointer p-0 ml-1";

    return (
        <main
            className="min-h-screen w-screen flex flex-col items-center justify-start bg-[#2b7a3a] p-1 font-sans"
            suppressHydrationWarning
        >
            {/* Card */}
            <div className="bg-white w-full h-full rounded-none p-1 shadow-none flex flex-col items-center justify-start">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-3">
                    <img src="/icon-192.png" alt="GolfLS" className="w-9 h-9 object-contain rounded-lg" />
                    <span className="text-3xl font-bold text-[#1b4332] tracking-tighter">GolfLS.app</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-black italic text-gray-900 uppercase mb-8 py-1 text-center tracking-tight">
                    {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'}
                </h1>

                {/* Error Message */}
                {error && (
                    <div className="text-red-500 text-2xl font-bold mb-6 text-center w-full p-3 bg-red-50 rounded-xl">
                        {error}
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div className="text-green-600 text-2xl font-bold mb-6 text-center w-full p-3 bg-green-50 rounded-xl break-all">
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
                                    <div className="text-2xl font-extrabold text-[#ced4da] mt-5">OR</div>
                                    <div className="flex-1">
                                        <label className={labelClass}>Handicap</label>
                                        <input className={inputClass} type="number" name="estimateHandicap" placeholder="0" defaultValue="0" />
                                    </div>
                                </div>
                                <p className="text-2xl text-gray-400 mt-1 italic leading-tight">
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
                        className={`w-full bg-[#1b4332] text-white border-none rounded-2xl p-1 text-2xl font-bold flex items-center justify-center gap-3 mt-4 shadow-[0_10px_20px_rgba(27,67,50,0.2)] uppercase ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-90'}`}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                                <ChevronRight size={24} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 text-center text-gray-600 text-2xl">
                    {mode === 'login' ? (
                        <>
                            Not a member yet?
                            <button onClick={() => setMode('signup')} className={linkBtnClass}>
                                CREATE AN ACCOUNT
                            </button>
                            <button onClick={() => setMode('forgot')} className="bg-transparent border-none block w-full mt-6 text-gray-400 font-medium text-2xl cursor-pointer">
                                Forgot your password?
                            </button>
                        </>
                    ) : mode === 'signup' ? (
                        <>
                            Already have an account?
                            <button onClick={() => setMode('login')} className={linkBtnClass}>
                                Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            Remember your password?
                            <button onClick={() => setMode('login')} className={linkBtnClass}>
                                Sign In
                            </button>
                        </>
                    )}
                </div>
            </div>


        </main>
    )
}
