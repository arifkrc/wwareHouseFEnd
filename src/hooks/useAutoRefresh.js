import { useEffect, useRef } from 'react';

export const useAutoRefresh = (callback, intervalMs) => {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        let interval;

        const handleVisibility = () => {
            clearInterval(interval);

            if (document.visibilityState === 'visible' && intervalMs) {
                // Execute immediately on visible? Optional.
                // For now, just start interval.
                interval = setInterval(() => {
                    if (callbackRef.current) callbackRef.current();
                }, intervalMs);
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        // Initial check
        if (document.visibilityState === 'visible' && intervalMs) {
            interval = setInterval(() => {
                if (callbackRef.current) callbackRef.current();
            }, intervalMs);
        }

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [intervalMs]);
};
