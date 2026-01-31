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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white w-full h-full flex flex-col overflow-hidden">

                {/* Map with Close Button Overlay */}
                <div className="flex-1 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-lg"
                    >
                        Close
                    </button>
                    <iframe
                        src={mapUrl}
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
