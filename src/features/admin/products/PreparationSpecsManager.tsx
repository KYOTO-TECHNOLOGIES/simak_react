import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X, Loader2, GripVertical } from "lucide-react";
import { productsApi, type PreparationSpecificationDto } from "./productApi";

interface PreparationSpecsManagerProps {
    productId: number;
    onSpecsChange?: (specs: Partial<PreparationSpecificationDto>[]) => void;
}

const PreparationSpecsManager: React.FC<PreparationSpecsManagerProps> = ({ productId, onSpecsChange }) => {
    const [specs, setSpecs] = useState<PreparationSpecificationDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Editing State
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [editForm, setEditForm] = useState<Partial<PreparationSpecificationDto>>({
        name: "",
        description: "",
        extra_price: "0.00",
        sort_order: 1,
        is_active: true,
        image: null,
    });

    useEffect(() => {
        if (!productId) {
            setLoading(false);
            return;
        }

        const fetchSpecs = async () => {
            try {
                const data = await productsApi.listPreparationSpecs(productId);
                setSpecs(data.sort((a, b) => a.sort_order - b.sort_order));
            } catch (err) {
                console.error("Failed to load preparation specs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSpecs();
    }, [productId]);

    const handleSave = async () => {
        if (!editForm.name) return;

        setSavingId(editingId === 'new' ? -1 : (editingId as number));
        try {
                    const payload = {
                        name: editForm.name,
                        description: editForm.description || "",
                        extra_price: editForm.extra_price || "0.00",
                        sort_order: editForm.sort_order || 1,
                        is_active: editForm.is_active ?? true,
                    } as any;
                    
                    let dataToSubmit: any = payload;
                    if (editForm.image instanceof File) {
                        const fd = new FormData();
                        Object.keys(payload).forEach(k => fd.append(k, payload[k]));
                        fd.append('image', editForm.image);
                        dataToSubmit = fd;
                    }

                    if (editingId === 'new') {
                        if (!productId) {
                            const newLocalSpec = {
                                id: Date.now(),
                                ...payload,
                                image: editForm.image,
                            } as PreparationSpecificationDto;
                            const updated = [...specs, newLocalSpec].sort((a, b) => a.sort_order - b.sort_order);
                            setSpecs(updated);
                            onSpecsChange?.(updated);
                        } else {
                            const newSpec = await productsApi.createPreparationSpec(productId, dataToSubmit);
                            const updated = [...specs, newSpec].sort((a, b) => a.sort_order - b.sort_order);
                            setSpecs(updated);
                            onSpecsChange?.(updated);
                        }
                    } else if (editingId) {
                        if (!productId) {
                            const updated = specs.map(s => s.id === editingId ? { ...s, ...payload, image: editForm.image !== undefined ? editForm.image : s.image } : s).sort((a, b) => a.sort_order - b.sort_order);
                            setSpecs(updated as PreparationSpecificationDto[]);
                            onSpecsChange?.(updated);
                        } else {
                            const updatedSpec = await productsApi.updatePreparationSpec(editingId as number, dataToSubmit);
                            const updated = specs.map(s => s.id === editingId ? updatedSpec : s).sort((a, b) => a.sort_order - b.sort_order);
                            setSpecs(updated);
                            onSpecsChange?.(updated);
                        }
                    }
            setEditingId(null);
        } catch (err) {
            console.error("Failed to save preparation spec", err);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this specification?")) return;
        
        setDeletingId(id);
        try {
            if (!productId) {
                const updated = specs.filter(s => s.id !== id);
                setSpecs(updated);
                onSpecsChange?.(updated);
            } else {
                await productsApi.deletePreparationSpec(id);
                const updated = specs.filter(s => s.id !== id);
                setSpecs(updated);
                onSpecsChange?.(updated);
            }
        } catch (err) {
            console.error("Failed to delete preparation spec", err);
        } finally {
            setDeletingId(null);
        }
    };

    const startEdit = (spec: PreparationSpecificationDto) => {
        setEditForm({
            name: spec.name,
            description: spec.description,
            extra_price: spec.extra_price,
            sort_order: spec.sort_order,
            is_active: spec.is_active,
            image: spec.image,
        });
        setEditingId(spec.id);
    };

    const startNew = () => {
        setEditForm({
            name: "",
            description: "",
            extra_price: "0.00",
            sort_order: specs.length > 0 ? Math.max(...specs.map(s => s.sort_order)) + 1 : 1,
            is_active: true,
            image: null,
        });
        setEditingId('new');
    };

    if (loading) {
        return (
            <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
                <Loader2 className="animate-spin text-zinc-300" size={24} />
            </div>
        );
    }

    return (
        <section className="bg-white border border-[#EEEEEE] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">Preparation Specifications</h2>
                    <p className="text-xs text-[#A1A1AA]">E.g., "Cleaned headon", "Live in air bag"</p>
                </div>
                <button
                    type="button"
                    onClick={startNew}
                    disabled={editingId !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                    <Plus size={14} /> Add Spec
                </button>
            </div>

            <div className="space-y-3">
                {specs.length === 0 && editingId !== 'new' ? (
                    <div className="text-center py-8 bg-[#FAFAFA] rounded-xl border-2 border-dashed border-[#EEEEEE]">
                        <p className="text-sm font-bold text-[#A1A1AA]">No preparation specs added yet.</p>
                    </div>
                ) : null}

                {(specs.length > 0 || editingId === 'new') && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="text-[10px] font-bold uppercase text-[#A1A1AA] tracking-widest border-b border-[#EEEEEE]">
                                    <th className="pb-3 font-medium">Order</th>
                                    <th className="pb-3 font-medium">Name</th>
                                    <th className="pb-3 font-medium">Extra Price (AED)</th>
                                    <th className="pb-3 font-medium">Active</th>
                                    <th className="pb-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EEEEEE]">
                                {specs.map(spec => (
                                    <tr key={spec.id} className="group">
                                        {editingId === spec.id ? (
                                            <EditRow
                                                form={editForm}
                                                setForm={setEditForm}
                                                onSave={handleSave}
                                                onCancel={() => setEditingId(null)}
                                                isSaving={savingId === spec.id}
                                            />
                                        ) : (
                                            <>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical size={14} className="text-[#D4D4D8]" />
                                                        <span className="font-mono text-xs">{spec.sort_order}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-start gap-3">
                                                        {spec.image && (
                                                            <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-[#EEEEEE] bg-stone-50 flex items-center justify-center">
                                                                {spec.image instanceof File ? (
                                                                    <img src={URL.createObjectURL(spec.image)} alt={spec.name} className="w-full h-full object-cover" />
                                                                ) : typeof spec.image === 'string' ? (
                                                                    <img src={spec.image} alt={spec.name} className="w-full h-full object-cover" />
                                                                ) : null}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-slate-800">{spec.name}</div>
                                                            {spec.description && <div className="text-xs text-slate-500 truncate max-w-[200px]">{spec.description}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 font-mono">+{spec.extra_price}</td>
                                                <td className="py-4">
                                                    <span className={`inline-block w-2 h-2 rounded-full ${spec.is_active ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button type="button" onClick={() => startEdit(spec)} className="p-1.5 text-stone-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors">
                                                            <Edit2 size={15} />
                                                        </button>
                                                        <button type="button" onClick={() => handleDelete(spec.id)} disabled={deletingId === spec.id} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                            {deletingId === spec.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                
                                {editingId === 'new' && (
                                    <tr>
                                        <EditRow
                                            form={editForm}
                                            setForm={setEditForm}
                                            onSave={handleSave}
                                            onCancel={() => setEditingId(null)}
                                            isSaving={savingId === -1}
                                        />
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
};

interface EditRowProps {
    form: Partial<PreparationSpecificationDto>;
    setForm: React.Dispatch<React.SetStateAction<Partial<PreparationSpecificationDto>>>;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

const EditRow: React.FC<EditRowProps> = ({ form, setForm, onSave, onCancel, isSaving }) => {
    return (
        <>
            <td className="py-3 pr-2 align-top">
                <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-black"
                />
            </td>
            <td className="py-3 pr-2 align-top">
                <div className="flex flex-col gap-2">
                    <input
                        type="text"
                        placeholder="Name (e.g. Cleaned)"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full min-w-[150px] px-3 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-lg text-xs outline-none focus:border-black"
                        autoFocus
                    />
                    <input
                        type="text"
                        placeholder="Description (optional)"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full min-w-[150px] px-3 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-lg text-xs outline-none focus:border-black"
                    />
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer text-[10px] font-bold px-2 py-1 bg-stone-100 rounded-md hover:bg-stone-200 text-stone-600 transition-colors border border-stone-200 inline-block">
                            {form.image ? 'Change Image' : 'Add Image'}
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setForm({ ...form, image: e.target.files[0] });
                                    }
                                }} 
                            />
                        </label>
                        {form.image && (
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] truncate max-w-[100px]">
                                    {form.image instanceof File ? form.image.name : 'Current Image'}
                                </span>
                                <button type="button" onClick={() => setForm({ ...form, image: null })} className="text-rose-500 hover:text-rose-700">
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="py-3 pr-2 align-top">
                <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.extra_price}
                    onChange={e => setForm({ ...form, extra_price: e.target.value })}
                    className="w-24 px-3 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-black"
                />
            </td>
            <td className="py-3 pr-2 align-top text-center">
                <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-black mt-2"
                />
            </td>
            <td className="py-3 align-top text-right">
                <div className="flex items-center justify-end gap-1 mt-1">
                    <button type="button" onClick={onSave} disabled={isSaving || !form.name} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50">
                        {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    </button>
                    <button type="button" onClick={onCancel} disabled={isSaving} className="p-1.5 text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50">
                        <X size={15} />
                    </button>
                </div>
            </td>
        </>
    );
};

export default PreparationSpecsManager;
