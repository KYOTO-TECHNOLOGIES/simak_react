import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { adminNotificationApi, type AdminNotificationDto } from './adminNotificationApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const AdminNotificationsDropdown: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<AdminNotificationDto[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [limit] = useState<number>(20);
    const [offset, setOffset] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async (reset: boolean = false) => {
        try {
            const is_read = filter === 'unread' ? false : filter === 'read' ? true : null;
            const pageOffset = reset ? 0 : offset;
            const { results, next } = await adminNotificationApi.listPaged({ limit, offset: pageOffset, is_read });
            if (reset) {
                setNotifications(results);
                setOffset(results.length);
            } else {
                setNotifications(prev => [...prev, ...results]);
                setOffset(prev => prev + results.length);
            }
            setHasMore(Boolean(next) || results.length === limit);
        } catch (error) {
            console.error("Failed to fetch admin notifications", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setNotifications([]);
            setOffset(0);
            setHasMore(true);
            fetchNotifications(true);
        }
    }, [isOpen, filter]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkAsRead = async (id: number) => {
        try {
            await adminNotificationApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await adminNotificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const openAction = (url?: string | null) => {
        if (!url) return;
        try {
            const cleaned = String(url).trim();
            if (!cleaned) return;
            if (/^https?:\/\//i.test(cleaned)) {
                window.location.href = cleaned;
            } else if (cleaned.startsWith('/')) {
                navigate(cleaned);
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const el = sentinelRef.current;
        if (!el) return;
        const io = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasMore && !isLoadingMore) {
                setIsLoadingMore(true);
                fetchNotifications(false).finally(() => setIsLoadingMore(false));
            }
        }, { root: null, rootMargin: '200px', threshold: 0 });
        io.observe(el);
        return () => io.disconnect();
    }, [isOpen, hasMore, isLoadingMore, fetchNotifications]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="text-[#A1A1AA] hover:text-black relative transition-colors focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell size={18} strokeWidth={1.5} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-96 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right flex flex-col max-h-[85vh]"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                                <p className="text-xs text-gray-500 mt-0.5">You have {unreadCount} unread messages</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <CheckCheck size={14} /> Mark all read
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="px-5 py-2 border-b border-gray-50 bg-gray-50/30">
                            <div className="inline-flex bg-slate-100/60 p-1 rounded-xl border border-slate-200">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${filter === 'unread' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Unread
                                </button>
                                <button
                                    onClick={() => setFilter('read')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${filter === 'read' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Read
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 h-[400px]">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center space-y-3">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                        <Bell size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-gray-50 transition-colors group relative ${notification.is_read ? 'opacity-70' : 'bg-blue-50/30'}`}
                                            onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                        >
                                            {!notification.is_read && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-blue-500 rounded-r-full transition-all group-hover:h-8 h-full" />
                                            )}
                                            <div className="flex justify-between items-start gap-4">
                                                <div className={`flex-1 ${!notification.is_read ? 'pl-2' : ''}`}>
                                                    <h4 className={`text-sm tracking-tight ${!notification.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <span className="text-[10px] font-medium text-gray-400 mt-2 block uppercase tracking-wider">
                                                        {new Date(notification.created_at).toLocaleString(undefined, {
                                                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                {notification.action_url && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!notification.is_read) {
                                                                handleMarkAsRead(notification.id);
                                                            }
                                                            openAction(notification.action_url);
                                                        }}
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                                                    >
                                                        Open
                                                    </button>
                                                )}
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(notification.id);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Mark as read"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await adminNotificationApi.delete(notification.id);
                                                            setNotifications(prev => prev.filter(n => n.id !== notification.id));
                                                        } catch (error) {
                                                            console.error("Failed to delete notification", error);
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={sentinelRef} className="h-6" />
                                    {isLoadingMore && (
                                        <div className="p-3 text-center text-xs text-slate-400">Loading…</div>
                                    )}
                                </div>
                            )}
                        </div>

                        
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminNotificationsDropdown;
