'use client';

import { X } from 'lucide-react';

type RulesModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: React.ReactNode;
};

export default function RulesModal({ isOpen, onClose, title, content }: RulesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{title}</h2>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors"
                >
                    Close
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="text-sm text-gray-600 leading-relaxed font-medium">
                    {content}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                    onClick={onClose}
                    className="bg-black text-white px-6 py-3 rounded-full font-bold text-[15pt] hover:bg-gray-800 transition-all w-full md:w-auto"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
