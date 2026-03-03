'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        // if ('serviceWorker' in navigator) {
        //     navigator.serviceWorker
        //         .register('/sw.js')
        //         .then((registration) => {
        //             console.log('Service Worker registered successfully:', registration.scope);
        //         })
        //         .catch((error) => {
        //             console.log('Service Worker registration failed:', error);
        //         });
        // }
        // Force unregister existing Service Workers to clear potential stale caches
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
        }
    }, []);

    return null; // This component doesn't render anything
}
