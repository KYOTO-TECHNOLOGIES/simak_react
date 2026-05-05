import { useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useSelector } from 'react-redux';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * A hook that polls for unread notifications and plays a sound when a new one arrives.
 * Polls every 30 seconds.
 */
export const useNotificationPolling = () => {
    const { isAuthenticated } = useSelector((state: any) => state.auth);
    const lastUnreadCount = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio object once
        if (!audioRef.current) {
            audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        }
    }, []);

    const fetchUnreadCount = async () => {
        if (!isAuthenticated) return;
        try {
            // We only need the count of unread notifications
            const res = await api.get('/notifications/', { params: { is_read: false, limit: 1 } });
            
            // Backend might return { results: [], count: X } or just an array
            const data = res.data;
            const currentUnreadCount = typeof data.count === 'number' 
                ? data.count 
                : (Array.isArray(data) ? data.filter((n: any) => !n.is_read).length : 0);
            
            // If the count increased since the last check, play the sound
            if (lastUnreadCount.current !== null && currentUnreadCount > lastUnreadCount.current) {
                audioRef.current?.play().catch(() => {
                    // Browsers often block autoplay until user interacts with the page.
                    // This is expected and usually fine as the user will interact eventually.
                    console.warn("Notification sound blocked by browser policy. User interaction required.");
                });
            }
            
            lastUnreadCount.current = currentUnreadCount;
        } catch (error) {
            // Fail silently to not disturb the user experience during polling
            console.debug("Notification polling error:", error);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            lastUnreadCount.current = null;
            return;
        }

        // Initial check to set the baseline
        fetchUnreadCount();

        // Start polling every 30 seconds
        const intervalId = setInterval(fetchUnreadCount, 30000);
        
        return () => clearInterval(intervalId);
    }, [isAuthenticated]);
};
