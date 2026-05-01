import React, { useState, useEffect, useCallback } from "react";
import {
    Plus, Trash2, Edit2, Save, X, Loader2, Send, FileText, Radio,
    Mail, Users, Globe, Image, Camera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    adminNotificationApi,
    type NotificationTemplateDto,
    type NotificationTemplatePayload,
    type BroadcastDto,
    type BroadcastPayload,
} from "./adminNotificationApi";
import { normalizeMediaUrl } from "../../../utils/media";

type Tab = "templates" | "broadcasts";

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */
const AdminNotificationsPage: React.FC = () => {
    const [tab, setTab] = useState<Tab>("templates");

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Notifications</h1>
                    <p className="text-slate-500 mt-1">Manage templates and send broadcasts to your users</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {(["templates", "broadcasts"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {t === "templates" ? <FileText size={16} /> : <Radio size={16} />}
                        {t === "templates" ? "Templates" : "Broadcasts"}
                    </button>
                ))}
            </div>

            {/* Content */}
            {tab === "templates" ? <TemplatesSection /> : <BroadcastsSection />}
        </div>
    );
};

/* ═══════════════════════════════════════════════
   Templates Section
   ═══════════════════════════════════════════════ */
const TemplatesSection: React.FC = () => {
    const [templates, setTemplates] = useState<NotificationTemplateDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<NotificationTemplateDto | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<NotificationTemplatePayload>({
        name: "", type: "IN_APP", subject: "", body: "",
    });

    const fetch = useCallback(async () => {
        try {
            const data = await adminNotificationApi.listTemplates();
            setTemplates(data);
        } catch { /* empty */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", type: "IN_APP", subject: "", body: "" });
        setModalOpen(true);
    };

    const openEdit = (t: NotificationTemplateDto) => {
        setEditing(t);
        setForm({ name: t.name, type: t.type, subject: t.subject, body: t.body });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                const updated = await adminNotificationApi.updateTemplate(editing.id, form);
                setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            } else {
                const created = await adminNotificationApi.createTemplate(form);
                setTemplates((prev) => [created, ...prev]);
            }
            setModalOpen(false);
        } catch { /* 400 modal will handle */ }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this template?")) return;
        try {
            await adminNotificationApi.deleteTemplate(id);
            setTemplates((prev) => prev.filter((t) => t.id !== id));
        } catch { /* ignore */ }
    };

    return (
        <>
            {/* Action bar */}
            <div className="flex justify-end">
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={20} /> New Template
                </button>
            </div>

            {/* List */}
            {loading ? (
                <LoadingState message="Loading templates…" />
            ) : templates.length === 0 ? (
                <EmptyState icon={<FileText size={40} className="text-slate-300" />} title="No Templates" subtitle="Create your first notification template." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence>
                        {templates.map((t) => (
                            <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500">
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.type}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(t)} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">{t.subject}</p>
                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{t.body}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal */}
            <FormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? "Edit Template" : "New Template"}
                subtitle="Configure your notification template"
                saving={saving}
                onSubmit={handleSave}
            >
                <FormField label="Template Name" required>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input" placeholder="e.g. Order Shipped" />
                </FormField>

                <FormField label="Type">
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="admin-input appearance-none">
                        <option value="IN_APP">In-App</option>
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="PUSH">Push</option>
                    </select>
                </FormField>

                <FormField label="Subject" required>
                    <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="admin-input" placeholder="Your order has shipped" />
                </FormField>

                <FormField label="Body" required>
                    <textarea required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="admin-input resize-none" placeholder="Hi {{ user.first_name }}, your order is on the way." />
                </FormField>
            </FormModal>
        </>
    );
};

/* ═══════════════════════════════════════════════
   Broadcasts Section
   ═══════════════════════════════════════════════ */
const BroadcastsSection: React.FC = () => {
    const [broadcasts, setBroadcasts] = useState<BroadcastDto[]>([]);
    const [templates, setTemplates] = useState<NotificationTemplateDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<BroadcastDto | null>(null);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState<number | null>(null);
    const [form, setForm] = useState<BroadcastPayload>({
        template: null, subject: "", message: "", type: "IN_APP",
        send_to_all: true, recipients: [], image: null,
    });
    const [uploadingFile, setUploadingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [recipientInput, setRecipientInput] = useState("");

    const fetchAll = useCallback(async () => {
        try {
            const [b, t] = await Promise.all([
                adminNotificationApi.listBroadcasts(),
                adminNotificationApi.listTemplates(),
            ]);
            setBroadcasts(b);
            setTemplates(t);
        } catch { /* empty */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openCreate = () => {
        setEditing(null);
        setForm({ template: null, subject: "", message: "", type: "IN_APP", send_to_all: true, recipients: [], image: null });
        setUploadingFile(null);
        setPreviewUrl(null);
        setRecipientInput("");
        setModalOpen(true);
    };

    const openEdit = (b: BroadcastDto) => {
        setEditing(b);
        setForm({
            template: b.template, subject: b.subject, message: b.message,
            type: b.type, send_to_all: b.send_to_all, recipients: b.recipients || [],
            image: b.image_url,
        });
        setUploadingFile(null);
        setPreviewUrl(b.image_url || null);
        setRecipientInput((b.recipients || []).join(", "));
        setModalOpen(true);
    };

    const parseRecipients = (val: string): number[] =>
        val.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const recipients = form.send_to_all ? [] : parseRecipients(recipientInput);

        // Use FormData if there is a file to upload
        let payload: any;
        if (uploadingFile) {
            payload = new FormData();
            if (form.template) payload.append("template", String(form.template));
            payload.append("subject", form.subject);
            payload.append("message", form.message);
            payload.append("type", form.type);
            payload.append("send_to_all", String(form.send_to_all));
            if (recipients.length > 0) {
                payload.append("recipients", JSON.stringify(recipients));
            }
            payload.append("image", uploadingFile);
        } else {
            payload = {
                ...form,
                recipients,
            };
        }
        try {
            if (editing) {
                const updated = await adminNotificationApi.updateBroadcast(editing.id, payload);
                setBroadcasts((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            } else {
                const created = await adminNotificationApi.createBroadcast(payload);
                setBroadcasts((prev) => [created, ...prev]);
            }
            setModalOpen(false);
        } catch { /* 400 modal will handle */ }
        finally { setSaving(false); }
    };

    const handleSend = async (id: number) => {
        if (!window.confirm("Send this broadcast now?")) return;
        setSending(id);
        try {
            await adminNotificationApi.sendBroadcast(id);
            await fetchAll(); // refresh to get updated sent_at
        } catch { /* ignore */ }
        finally { setSending(null); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this broadcast?")) return;
        try {
            await adminNotificationApi.deleteBroadcast(id);
            setBroadcasts((prev) => prev.filter((b) => b.id !== id));
        } catch { /* ignore */ }
    };

    return (
        <>
            {/* Action bar */}
            <div className="flex justify-end">
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={20} /> New Broadcast
                </button>
            </div>

            {/* List */}
            {loading ? (
                <LoadingState message="Loading broadcasts…" />
            ) : broadcasts.length === 0 ? (
                <EmptyState icon={<Radio size={40} className="text-slate-300" />} title="No Broadcasts" subtitle="Create your first broadcast message." />
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {broadcasts.map((b) => {
                            const isSent = !!b.sent_at;
                            return (
                                <motion.div
                                    key={b.id}
                                    layout
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg transition-all group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSent ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"}`}>
                                            {isSent ? <Send size={20} /> : <Radio size={20} />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-sm font-bold text-slate-900 truncate">{b.subject || "(No subject)"}</h3>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isSent ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                                    {isSent ? "Sent" : "Draft"}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-50 text-slate-500">
                                                    {b.type}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-1 mb-1">{b.message || "(No message)"}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    {b.send_to_all ? <><Globe size={10} /> All users</> : <><Users size={10} /> {b.recipients?.length || 0} recipients</>}
                                                </span>
                                                {b.sent_at && (
                                                    <span>Sent {new Date(b.sent_at).toLocaleDateString("en-AE", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                                )}
                                                {b.image_url && (
                                                    <span className="flex items-center gap-1 text-cyan-600 font-bold">
                                                        <Image size={10} /> Has Image
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Image Thumbnail (Small) */}
                                        {normalizeMediaUrl(b.image_url) && (
                                            <div className="hidden lg:block w-16 h-10 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                                <img src={normalizeMediaUrl(b.image_url)!} alt="Broadcast" className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {!isSent && (
                                                <button
                                                    onClick={() => handleSend(b.id)}
                                                    disabled={sending === b.id}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                                                >
                                                    {sending === b.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                    Send
                                                </button>
                                            )}
                                            {!isSent && (
                                                <button onClick={() => openEdit(b)} className="p-2.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(b.id)} className="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal */}
            <FormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? "Edit Broadcast" : "New Broadcast"}
                subtitle="Compose a message for your users"
                saving={saving}
                onSubmit={handleSave}
            >
                <FormField label="Template (Optional)">
                    <select
                        value={form.template ?? ""}
                        onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setForm({ ...form, template: val });
                            if (val) {
                                const tpl = templates.find((t) => t.id === val);
                                if (tpl) {
                                    setForm((f) => ({
                                        ...f,
                                        template: val,
                                        subject: f.subject || tpl.subject,
                                        message: f.message || tpl.body,
                                        type: tpl.type || f.type,
                                    }));
                                }
                            }
                        }}
                        className="admin-input appearance-none"
                    >
                        <option value="">None — manual entry</option>
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Type">
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="admin-input appearance-none">
                        <option value="IN_APP">In-App</option>
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="PUSH">Push</option>
                    </select>
                </FormField>

                <FormField label="Subject">
                    <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="admin-input" placeholder="Big Sale" />
                </FormField>

                <FormField label="Message">
                    <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="admin-input resize-none" placeholder="Up to 50% off today." />
                </FormField>
                
                {form.type === "PUSH" && (
                    <FormField label="Push Image (Optional)">
                        <div className="space-y-4">
                            <div 
                                className="relative group aspect-video rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all"
                                onClick={() => document.getElementById('broadcast-image')?.click()}
                            >
                                {previewUrl ? (
                                    <>
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera className="text-white" size={24} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Image size={32} className="mb-2" />
                                        <span className="text-xs font-bold">Click to upload image</span>
                                        <span className="text-[10px]">Max size: 2MB</span>
                                    </div>
                                )}
                                <input 
                                    id="broadcast-image"
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setUploadingFile(file);
                                            setPreviewUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </div>
                            {previewUrl && (
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setUploadingFile(null);
                                        setPreviewUrl(null);
                                        setForm({ ...form, image: null });
                                    }}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors ml-2"
                                >
                                    Remove Image
                                </button>
                            )}
                        </div>
                    </FormField>
                )}

                {/* Audience */}
                <FormField label="Audience">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <input
                            type="checkbox"
                            id="send_to_all"
                            checked={form.send_to_all}
                            onChange={(e) => setForm({ ...form, send_to_all: e.target.checked })}
                            className="w-5 h-5 accent-black rounded cursor-pointer"
                        />
                        <label htmlFor="send_to_all" className="text-sm font-bold text-slate-900 cursor-pointer">Send to all users</label>
                    </div>
                </FormField>

                {!form.send_to_all && (
                    <FormField label="Recipient User IDs (comma-separated)">
                        <input
                            value={recipientInput}
                            onChange={(e) => setRecipientInput(e.target.value)}
                            className="admin-input"
                            placeholder="1, 2, 3"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 ml-1">Enter user IDs separated by commas</p>
                    </FormField>
                )}
            </FormModal>
        </>
    );
};

/* ═══════════════════════════════════════════════
   Shared UI
   ═══════════════════════════════════════════════ */

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Loader2 className="animate-spin text-slate-300 mb-4" size={40} />
        <p className="text-slate-400 font-medium">{message}</p>
    </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-slate-400 mb-2">{subtitle}</p>
    </div>
);

const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

const FormModal: React.FC<{
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    saving: boolean;
    onSubmit: (e: React.FormEvent) => void;
    children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, saving, onSubmit, children }) => (
    <AnimatePresence>
        {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900">{title}</h2>
                            <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                        {children}

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={onClose} className="flex-1 py-3.5 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-[2] py-3.5 bg-black text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

/* ── Input Styles (injected once) ── */
const style = document.createElement("style");
style.textContent = `
  .admin-input {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 1rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #0f172a;
    outline: none;
    transition: all 0.2s ease;
  }
  .admin-input:focus {
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
    background: #fff;
  }
  .admin-input::placeholder {
    color: #cbd5e1;
    font-weight: 500;
  }
`;
if (!document.getElementById("admin-notif-styles")) {
    style.id = "admin-notif-styles";
    document.head.appendChild(style);
}

export default AdminNotificationsPage;
