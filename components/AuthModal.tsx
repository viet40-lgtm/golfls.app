'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { login, signup } from '@/app/actions/auth'
import { Dna, Phone, Lock, User, X, Mail, Calendar, Trophy } from 'lucide-react'

type AuthMode = 'signin' | 'signup'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

function SubmitButton({ mode }: { mode: AuthMode }) {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-black text-white font-bold text-lg py-3 rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50 mt-6 uppercase tracking-wider"
        >
            {pending ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
    )
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('signin')
    const [error, setError] = useState<string | null>(null)
    const [identifier, setIdentifier] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    // New state for dynamic ID generation
    const [firstName, setFirstName] = useState('')
    const [phone, setPhone] = useState('')
    const [suggestedPlayerId, setSuggestedPlayerId] = useState('')

    useEffect(() => {
        if (firstName && phone.length >= 4) {
            const last4 = phone.replace(/\D/g, '').slice(-4);
            if (last4.length === 4) {
                setSuggestedPlayerId((firstName.charAt(0) + last4).toUpperCase());
            } else {
                setSuggestedPlayerId('');
            }
        } else {
            setSuggestedPlayerId('');
        }
    }, [firstName, phone]);

    useEffect(() => {
        const savedIdentifier = localStorage.getItem('last_login_identifier') || localStorage.getItem('last_login_email')
        const savedPassword = localStorage.getItem('last_login_password')
        if (savedIdentifier) setIdentifier(savedIdentifier)
        if (savedPassword) setPassword(savedPassword)
    }, [])

    if (!isOpen) return null

    async function handleSubmit(formData: FormData) {
        setError(null)
        const action = mode === 'signin' ? login : signup

        try {
            const result = await action(null, formData)
            if (result?.error) {
                setError(result.error)
            } else if (result?.success) {
                onClose()
                window.location.reload() // Refresh to update session state
            }
        } catch (e) {
            setError('An unexpected error occurred')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="p-8 flex flex-col items-center">

                    <h1 className="text-3xl font-bold text-black mb-2">
                        {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </h1>

                    {mode === 'signin' && (
                        <p className="text-red-500 font-semibold mb-6 text-center">
                            For testing just select: <br /> Sign in
                        </p>
                    )}

                    {/* Dna Icon Placeholder - Golden/Yellowish */}
                    <div className="mb-8 text-[#d4af37]">
                        <Dna size={64} strokeWidth={2.5} />
                    </div>

                    <div className="w-full text-left mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {mode === 'signin' ? 'Welcome Back' : (
                                <span>
                                    GET STARTED <span className="text-[#1a4d2e] ml-2">{suggestedPlayerId ? `ID: ${suggestedPlayerId}` : ''}</span>
                                </span>
                            )}
                        </h3>
                        <p className="text-gray-500">
                            {mode === 'signin' ? 'Sign in to your health dashboard' : 'Join Chu Precision Health Center'}
                        </p>
                    </div>

                    <form action={handleSubmit} className="w-full space-y-4">
                        {mode === 'signup' && (
                            <div className="space-y-4">
                                {/* 1. NAME */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-600 block">First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                name="firstName"
                                                type="text"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-600 block">Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                name="lastName"
                                                type="text"
                                                placeholder="Doe"
                                                className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. PHONE */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600 block">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            name="phone"
                                            type="tel"
                                            placeholder="(555) 555-5555"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 3. PASSWORD */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600 block">Password / PIN</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 4. EMAIL */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600 block">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            name="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 5. PREFERRED TEE BOX */}
                                <div className="space-y-1">
                                    <label htmlFor="preferredTeeBox" className="text-sm font-medium text-gray-600 block">Preferred Tee Box</label>
                                    <div className="relative">
                                        <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <select
                                            id="preferredTeeBox"
                                            name="preferredTeeBox"
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all appearance-none"
                                        >
                                            <option value="">Select a tee box</option>
                                            <option value="Black">Black</option>
                                            <option value="Blue">Blue</option>
                                            <option value="White">White</option>
                                            <option value="Gold">Gold</option>
                                            <option value="Green">Green</option>
                                            <option value="Red">Red</option>
                                        </select>
                                    </div>
                                </div>

                                {/* 6. HANDICAP INDEX */}
                                <div className="space-y-1">
                                    <label htmlFor="handicapIndex" className="text-sm font-medium text-gray-600 block">Handicap Index</label>
                                    <div className="relative">
                                        <input
                                            id="handicapIndex"
                                            name="handicapIndex"
                                            type="number"
                                            step="0.1"
                                            placeholder="e.g. 15.4"
                                            className="w-full pl-4 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 italic">
                                        If don't know index, handicap will be calculated after 5 rounds.
                                    </p>
                                </div>
                            </div>
                        )}

                        {mode === 'signin' && (
                            /* SIGN IN FORM FIELDS */
                            <>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600 block">
                                        Email or Player ID
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            name="identifier"
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => {
                                                setIdentifier(e.target.value)
                                                localStorage.setItem('last_login_identifier', e.target.value)
                                            }}
                                            autoFocus={!identifier}
                                            placeholder="Email or Player ID"
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600 block">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            name="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value)
                                                localStorage.setItem('last_login_password', e.target.value)
                                            }}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <SubmitButton mode={mode} />
                    </form>

                    {mode === 'signin' && (
                        <button className="mt-4 text-[#1a4d2e] font-bold text-lg hover:underline">
                            FORGOT PASSWORD?
                        </button>
                    )}

                    <div className="mt-6 text-gray-500">
                        {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setMode(mode === 'signin' ? 'signup' : 'signin')
                                setError(null)
                            }}
                            className="text-[#1a4d2e] font-bold hover:underline"
                        >
                            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>

                </div>
            </div>
        </div >
    )
}
