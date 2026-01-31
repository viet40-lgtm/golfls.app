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
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white w-full h-full shadow-2xl overflow-hidden flex flex-col transform transition-all border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-1 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{title}</h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                        {content}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-black text-white px-4 py-2 rounded-full font-bold text-[15pt] hover:bg-gray-800 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
