'use client';

import { useState } from 'react';
import { createPlayer } from '@/app/actions/create-player';
import { X } from 'lucide-react';

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        preferredTeeBox: 'White',
        birthday: '',
        dateStarted: '',
        handicapIndex: ''
    });

    if (!isOpen) return null;

    const hasChanges = Object.values(formData).some(val => val !== '' && val !== 'White') || formData.preferredTeeBox !== 'White';
    // Simplified: just check if any value is different from initial (empty strings and White for tee)
    const isDirty = () => {
        return formData.name !== '' ||
            formData.email !== '' ||
            formData.phone !== '' ||
            formData.password !== '' ||
            formData.preferredTeeBox !== 'White' ||
            formData.birthday !== '' ||
            formData.dateStarted !== '' ||
            formData.handicapIndex !== '';
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const fd = new FormData();
        Object.entries(formData).forEach(([key, value]) => fd.append(key, value));
        const result = await createPlayer(fd);

        setIsSubmitting(false);

        if (result.success) {
            alert('Player added successfully!');
            onClose();
        } else {
            alert(result.error || 'Failed to add player');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between safe-top">
                <div className="w-10"></div>
                <h2 className="text-[18pt] font-bold text-gray-900 text-center flex-1">Add New Player</h2>
                <div className="w-10"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Name */}
                <div>
                    <label htmlFor="name" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        placeholder="First Last"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="player@example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Phone */}
                <div>
                    <label htmlFor="phone" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Phone
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        placeholder="(123) 456-7890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Optional"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Preferred Tee Box */}
                <div>
                    <label htmlFor="preferredTeeBox" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Preferred Tee Box
                    </label>
                    <select
                        id="preferredTeeBox"
                        name="preferredTeeBox"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.preferredTeeBox}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    >
                        <option value="Black">Black</option>
                        <option value="Blue">Blue</option>
                        <option value="White">White</option>
                        <option value="Gold">Gold</option>
                        <option value="Green">Green</option>
                        <option value="Red">Red</option>
                    </select>
                </div>

                {/* Birthday */}
                <div>
                    <label htmlFor="birthday" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Birthday
                    </label>
                    <input
                        type="date"
                        id="birthday"
                        name="birthday"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.birthday}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Date Started */}
                <div>
                    <label htmlFor="dateStarted" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Date Started
                    </label>
                    <input
                        type="date"
                        id="dateStarted"
                        name="dateStarted"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.dateStarted}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Handicap Index */}
                <div>
                    <label htmlFor="handicapIndex" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Official Index
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        id="handicapIndex"
                        name="handicapIndex"
                        placeholder="0.0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.handicapIndex}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 pb-12">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold shadow-md active:scale-95"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`flex-1 px-4 py-2 text-white rounded-full text-[15pt] font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDirty() ? 'bg-blue-600' : 'bg-black'}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Adding...' : 'Add Player'}
                    </button>
                </div>
            </form>
        </div>
    );
}
