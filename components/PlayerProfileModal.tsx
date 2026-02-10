
'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, X, Calendar } from 'lucide-react';
import { Player, Round, TeeBox, RoundPlayer } from '@prisma/client';
import { updatePlayerProfile } from '@/app/actions/update-player';

export type PlayerWithRounds = Player & {
    rounds: (RoundPlayer & {
        round: Round;
        tee_box: TeeBox | null;
    })[];
    points?: number;
    money?: number;
};

interface PlayerProfileModalProps {
    player: PlayerWithRounds;
    isOpen: boolean;
    onClose: () => void;
    liveIndex: number;
    courseHandicap: number;
}

export function PlayerProfileModal({ player, isOpen, onClose, liveIndex, courseHandicap }: PlayerProfileModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initial State derivation
    const getInitialState = () => ({
        firstName: player.name.split(' ')[0],
        lastName: player.name.split(' ').slice(1).join(' '),
        email: player.email || '',
        phone: player.phone || '',
        password: '',
        birthday: player.birthday ? new Date(player.birthday).toISOString().split('T')[0] : '',
        dateStarted: player.dateStarted ? new Date(player.dateStarted).toISOString().split('T')[0] : '',
        preferredTeeBox: player.preferredTeeBox || 'White',
        handicapIndex: player.handicapIndex.toString()
    });

    const [formData, setFormData] = useState(getInitialState());

    // Reset form when opening/closing or changing edit mode
    React.useEffect(() => {
        if (isOpen) {
            setFormData(getInitialState());
        }
    }, [isOpen, player, isEditing]);

    if (!isOpen) return null;

    // Derived Data for Display
    const points = player.points || 0;
    const allTimeWinnings = player.money || 0;
    const ytdWinnings = 0;
    const currentYear = new Date().getFullYear().toString();
    const lowIndex = '-';
    const displayTee = player.preferredTeeBox || 'White';

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(getInitialState());

    // Handle Form Submit
    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSaving(true);

        const data = new FormData();
        data.append('id', player.id);
        data.append('firstName', formData.firstName);
        data.append('lastName', formData.lastName);
        data.append('email', formData.email);
        data.append('phone', formData.phone);
        data.append('password', formData.password);
        data.append('birthday', formData.birthday);
        data.append('dateStarted', formData.dateStarted);
        data.append('preferredTeeBox', formData.preferredTeeBox);
        data.append('handicapIndex', formData.handicapIndex);

        const result = await updatePlayerProfile(data);
        setIsSaving(false);
        if (result.success) {
            setIsEditing(false);
            window.location.reload();
        } else {
            alert('Failed to save changes');
        }
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white p-1 animate-in fade-in duration-200">
            <div className="bg-white w-full h-full shadow-none flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="relative pt-8 pb-4 px-1 text-left border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-2 top-2 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-800 transition-all z-50"
                            title="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <h2 className="text-[14pt] font-extrabold text-gray-900 tracking-tight ml-3">
                            {player.name}
                        </h2>
                        <p className="text-gray-500 font-medium mt-1 uppercase tracking-wide text-[14pt] ml-3">Player Profile</p>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto px-1 py-6 space-y-8 no-scrollbar bg-white flex-1">

                        {!isEditing ? (
                            // --- VIEW MODE ---
                            <>
                                {/* Stats Row */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">HCP</span>
                                        <span className="text-[14pt] font-black text-slate-800">{courseHandicap}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">INDEX</span>
                                        <span className="text-[14pt] font-black text-slate-800">{liveIndex.toFixed(1)}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">POINTS</span>
                                        <span className="text-[14pt] font-black text-slate-800">{points}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">LOW INDEX</span>
                                        <span className="text-[14pt] font-black text-slate-800">{lowIndex}</span>
                                    </div>
                                </div>

                                {/* Winnings Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100 flex flex-col items-center justify-center text-center shadow-sm">
                                        <span className="text-[14pt] font-bold text-emerald-600 uppercase tracking-wider mb-2">YTD Winning</span>
                                        <span className="text-[14pt] font-black text-emerald-700">${ytdWinnings.toFixed(2)}</span>
                                        <span className="text-[14pt] font-bold text-emerald-400 mt-1">{currentYear}</span>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-orange-100 flex flex-col items-center justify-center text-center shadow-sm">
                                        <span className="text-[14pt] font-bold text-orange-600 uppercase tracking-wider mb-2">Gross Winning</span>
                                        <span className="text-[14pt] font-black text-orange-700">${allTimeWinnings.toFixed(2)}</span>
                                        <span className="text-[14pt] font-bold text-orange-400 mt-1">All Time</span>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-purple-500">#</span>
                                        <h3 className="font-bold text-gray-900 text-[14pt]">Contact Information</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border border-gray-100 rounded-xl p-4 flex gap-4 items-start">
                                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Email</span>
                                                <span className="font-semibold text-gray-900 break-all">{player.email || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="border border-gray-100 rounded-xl p-4 flex gap-4 items-start">
                                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                                <Phone size={18} />
                                            </div>
                                            <div>
                                                <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Phone</span>
                                                <span className="font-semibold text-gray-900">{player.phone || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="border border-gray-100 rounded-xl p-4 flex gap-4 items-start">
                                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                                <X size={18} />
                                            </div>
                                            <div>
                                                <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Password</span>
                                                <span className="font-semibold text-gray-900">••••••••</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>



                                {/* Golf Profile */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrophyIcon className="text-yellow-500 w-5 h-5" />
                                        <h3 className="font-bold text-gray-900 text-[14pt]">Golf Profile</h3>
                                    </div>
                                    <div className="border border-gray-100 rounded-xl p-5">
                                        <div className="space-y-4">
                                            <div className="flex gap-4 items-center">
                                                <div className="p-2 bg-gray-50 text-gray-500 rounded-lg">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Preferred Tee Box</span>
                                                    <span className="font-bold text-gray-900 text-[14pt]">{displayTee}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <div className="p-2 bg-gray-50 text-gray-500 rounded-lg">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Date Started</span>
                                                    <span className="font-bold text-gray-900 text-[14pt]">{player.dateStarted ? new Date(player.dateStarted).toLocaleDateString() : '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // --- EDIT MODE ---
                            <div className="space-y-6">
                                <div className="space-y-6">
                                    {/* Name Inputs */}
                                    <div>
                                        <h4 className="text-[14pt] font-bold text-gray-900 uppercase tracking-wide mb-3 border-b pb-1">Name</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="edit-firstName" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">First Name</label>
                                                <input
                                                    id="edit-firstName"
                                                    value={formData.firstName}
                                                    onChange={e => handleChange('firstName', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="First"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="edit-lastName" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Last Name</label>
                                                <input
                                                    id="edit-lastName"
                                                    value={formData.lastName}
                                                    onChange={e => handleChange('lastName', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Last"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Inputs */}
                                    <div>
                                        <h4 className="text-[14pt] font-bold text-gray-900 uppercase tracking-wide mb-3 border-b pb-1">Contact</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label htmlFor="edit-email" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Email</label>
                                                <input
                                                    id="edit-email"
                                                    value={formData.email}
                                                    onChange={e => handleChange('email', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="edit-phone" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Phone</label>
                                                <input
                                                    id="edit-phone"
                                                    value={formData.phone}
                                                    onChange={e => handleChange('phone', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="555-555-5555"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="edit-password" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">New Password</label>
                                                <input
                                                    id="edit-password"
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={e => handleChange('password', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Leave blank to keep current"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Inputs */}
                                    <div>
                                        <h4 className="text-[14pt] font-bold text-gray-900 uppercase tracking-wide mb-3 border-b pb-1">Personal & Golf</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="edit-birthday" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Birthday</label>
                                                <input
                                                    id="edit-birthday"
                                                    type="date"
                                                    value={formData.birthday}
                                                    onChange={e => handleChange('birthday', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="edit-dateStarted" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Date Started</label>
                                                <input
                                                    id="edit-dateStarted"
                                                    type="date"
                                                    value={formData.dateStarted}
                                                    onChange={e => handleChange('dateStarted', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="edit-preferredTeeBox" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Preferred Tee Box</label>
                                                <select
                                                    id="edit-preferredTeeBox"
                                                    value={formData.preferredTeeBox}
                                                    onChange={e => handleChange('preferredTeeBox', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="Black">Black</option>
                                                    <option value="Blue">Blue</option>
                                                    <option value="White">White</option>
                                                    <option value="Gold">Gold</option>
                                                    <option value="Green">Green</option>
                                                    <option value="Red">Red</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="edit-handicapIndex" className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Official Index</label>
                                                <input
                                                    id="edit-handicapIndex"
                                                    type="number"
                                                    step="0.1"
                                                    value={formData.handicapIndex}
                                                    onChange={e => handleChange('handicapIndex', e.target.value)}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="0.0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>


                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 rounded-full font-bold text-[15pt] text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`px-4 py-2 rounded-full font-bold text-[15pt] shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 ${hasChanges
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-black text-white hover:bg-gray-800'
                                        }`}
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-full font-bold text-[15pt] shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95"
                            >
                                Edit Player Profile
                            </button>
                        )}
                    </div>
                </form>

            </div>
        </div>
    );
}

function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}
