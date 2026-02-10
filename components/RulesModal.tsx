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
        <div className="fixed inset-0 z-[200] bg-white p-1">
            <div className="relative bg-white w-full h-full shadow-none overflow-hidden flex flex-col transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-1 py-4 border-b border-gray-100 bg-gray-50/50 relative">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase ml-1 mt-2">{title}</h2>
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-800 transition-all z-50"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="text-2xl text-gray-600 leading-relaxed font-medium">
                        {content}
                    </div>
                </div>
            </div>
        </div>
    );
}



