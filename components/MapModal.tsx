'use client';

import { X } from 'lucide-react';

interface MapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MapModal({ isOpen, onClose }: MapModalProps) {
    if (!isOpen) return null;

    const address = "1040 Filmore Ave, New Orleans, LA 70124";
    const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    return (
        <div className="fixed inset-0 z-[200] bg-white p-1">
            <div className="bg-white w-full h-full flex flex-col overflow-hidden">

                {/* Map with Close Button Overlay */}
                <div className="flex-1 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 z-10 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-800 transition-all"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <iframe
                        src={mapUrl}
                        title="Google Map Location"
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>

                {/* Address Footer */}
                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                    <p className="text-[14pt] font-bold text-gray-900 text-center">{address}</p>
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-[14pt] text-blue-600 hover:text-blue-800 font-semibold text-center underline"
                    >
                        Open in Google Maps
                    </a>
                </div>
            </div>
        </div>
    );
}
