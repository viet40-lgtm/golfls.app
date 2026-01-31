'use client';

import { useState } from 'react';
import { MapModal } from './MapModal';

export function AddressButton() {
    const [isMapOpen, setIsMapOpen] = useState(false);

    return (
        <>
            <p
                onClick={() => setIsMapOpen(true)}
                className="text-white/80 text-[14pt] mt-1 drop-shadow-sm font-medium w-full cursor-pointer hover:text-white hover:underline transition-colors"
            >
                1040 Filmore Ave, New Orleans, LA 70124.
            </p>
            <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
        </>
    );
}
