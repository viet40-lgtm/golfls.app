'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
    useEffect(() => {
        /*
        if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            // Only register in production or if explicitly testing PWA behavior
            // logic modified to allow localhost testing for now per user flow
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        } else if ('serviceWorker' in navigator) {
            // Also allowing on localhost for verification purposes
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered (Localhost) with scope:', registration.scope);
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }
        */
    }, []);

    return null;
}
