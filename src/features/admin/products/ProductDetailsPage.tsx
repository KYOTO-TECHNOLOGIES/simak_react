          import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Package, Tag, Clock, Star, Edit3, Truck, Image as ImageIcon, Video, Play, Users, Mail, Phone, Bell } from "lucide-react";
import { productsApi, type ProductDto, type NotifyingUsersResponse } from "./productApi";
import MediaLightbox, { type MediaItem } from "./MediaLightbox";

function getBestImage(dto: ProductDto): string | null {
  if (dto.image) return dto.image;
  const featured = dto.images?.find((img) => img.is_feature);
  if (featured) return featured.image;
  return dto.images?.[0]?.image || null;
}

function mapDto(dto: ProductDto) {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    description: dto.description,
    categoryId: dto.category,
    categoryName: dto.category_name,
    unit: dto.unit || null,
    price: parseFloat(dto.price),
    discountPrice: dto.discount_price ? parseFloat(dto.discount_price) : null,
    finalPrice: parseFloat(dto.final_price),
    sku: dto.sku,
    stock: dto.stock,
    isAvailable: dto.is_available,
    imageUrl: getBestImage(dto),
    images: dto.images.map((img) => ({ id: img.id, url: img.image, isFeature: img.is_feature })),
    videos: dto.videos.map((v) => ({ id: v.id, url: v.video_url || v.video_file || "", title: v.title })),
    averageRating: dto.average_rating,
    totalReviews: dto.total_reviews,
    expectedDeliveryTime: dto.expected_delivery_time,
    discountTiers: dto.discount_tiers.map((t) => ({
      id: t.id,
      minQuantity: t.min_quantity,
      discountPercentage: t.discount_percentage !== undefined && t.discount_percentage !== null
        ? parseFloat(String(t.discount_percentage))
        : 0,
    })),
    deliveryTiers: dto.delivery_tiers.map((t) => ({
      id: t.id,
      minQuantity: t.min_quantity,
      deliveryDays: t.delivery_days || 0,
      name: `${t.min_quantity}+ units`,
    })),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    availableEmirates: dto.available_emirates || [],
  };
}

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ReturnType<typeof mapDto> | null>(null);
  const [notifyingUsers, setNotifyingUsers] = useState<NotifyingUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [dto, notifyingUsersData] = await Promise.all([
        productsApi.details(Number(id)),
        productsApi.notifyingUsers(Number(id)).catch(() => null)
      ]);
      setProduct(mapDto(dto));
      setNotifyingUsers(notifyingUsersData);
    } catch (e: any) {
      setError(e?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = useMemo(() => {
    if (!product) return null;
    const status = product.isAvailable
      ? (product.stock > 0 ? "Active" : "Out of Stock")
      : "Draft";
    const cls =
      status === "Active"
        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
        : status === "Out of Stock"
          ? "bg-rose-50 text-rose-600 border-rose-100"
          : "bg-gray-50 text-gray-600 border-gray-200";
    return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${cls}`}>{status}</span>;
  }, [product]);

  return (
    <div className="min-h-screen w-full text-[#18181B] bg-[#FDFDFD]">
      <div className="  mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/products")}
              className="p-2 border border-[#EEEEEE] rounded-lg hover:bg-gray-50 transition-colors"
              title="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                {product?.name || "Product"}
              </h1>
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Product Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge}
            <button
              disabled={!product}
              onClick={() => navigate(`/admin/products/edit/${product?.id}`)}
              className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-[#222]"
              title="Edit Product"
            >
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>

        {loading && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl">Loading…</div>}
        {error && <div className="p-6 bg-white border border-[#EEEEEE] rounded-2xl text-rose-600">{error}</div>}
        {product && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-28 h-28 rounded-xl bg-slate-100 flex items-center justify-center border border-[#EEEEEE] overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={28} className="text-[#A1A1AA]" />
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    <div>
                      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Name</p>
                      <p className="text-sm font-bold">{product.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Slug</p>
                      <p className="text-sm font-bold">{product.slug}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Category</p>
                      <p className="text-sm font-bold">{product.categoryName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">SKU</p>
                      <p className="text-sm font-bold">{product.sku}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Unit</p>
                      <p className="text-sm font-bold">
                        {product.unit === "kg" ? "Kg" : product.unit === "piece" ? "Piece" : product.unit === "Gram" ? "100g" : (product.unit || "—")}
                      </p>
                    </div>
                    {product.availableEmirates && product.availableEmirates.length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1.5">Available Emirates</p>
                        <div className="flex flex-wrap gap-1.5">
                          {product.availableEmirates.map(emirate => (
                            <span key={emirate} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[10px] font-semibold">
                              {emirate}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {product.description && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">Description</p>
                    <p className="text-sm whitespace-pre-line">{product.description}</p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Price</p>
                  <p className="text-lg font-black">AED {product.finalPrice.toLocaleString()}</p>
                  {product.discountPrice !== null && product.discountPrice < product.price && (
                    <p className="text-[11px] text-[#A1A1AA] line-through">AED {product.price.toLocaleString()}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Stock</p>
                  <p className="text-lg font-black">{product.stock}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Delivery</p>
                  <p className="text-sm font-bold flex items-center gap-2"><Clock size={12} /> {product.expectedDeliveryTime || "—"}</p>
                </div>
              </div>

              {!!product.images.length && (
                <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-3 flex items-center gap-2"><ImageIcon size={12} /> Images</p>
                  <div className="flex flex-wrap gap-3">
                    {product.images.map((img, idx) => {
                      const items: MediaItem[] = product.images.map(i => ({ id: i.id, type: "image", src: i.url }));
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setLightbox({ items, index: idx })}
                          className="relative w-28 h-28 rounded-xl border border-[#EEEEEE] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={20} className="text-white" fill="white" />
                          </div>
                          {img.isFeature && (
                            <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">Feature</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!!product.videos.length && (
                <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-3 flex items-center gap-2"><Video size={12} /> Videos</p>
                  <div className="flex flex-col gap-2">
                    {product.videos.map((v) => {
                      const items: MediaItem[] = product.videos
                        .filter(vi => !!vi.url)
                        .map(vi => ({ id: vi.id, type: "video", src: vi.url, title: vi.title || undefined }));
                      const itemIdx = items.findIndex(i => i.id === v.id);
                      return (
                        <div key={v.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-sm font-medium text-slate-700 truncate">{v.title || "Product Video"}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {v.url && itemIdx !== -1 && (
                              <button
                                type="button"
                                onClick={() => setLightbox({ items, index: itemIdx })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-colors"
                              >
                                <Play size={12} fill="white" /> Play
                              </button>
                            )}
                            {v.url && (
                              <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 font-medium hover:underline">
                                Open ↗
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star size={14} className={`${product.averageRating > 0 ? "fill-amber-400 text-amber-400" : "text-[#D4D4D8]"}`} />
                    <span className="text-xs font-bold">{product.averageRating.toFixed(1)} ({product.totalReviews})</span>
                  </div>
                </div>
                {!!product.discountTiers.length && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-2 flex items-center gap-2"><Tag size={12} /> Discount Tiers</p>
                    <div className="space-y-2">
                      {product.discountTiers.map((t) => (
                        <div key={t.id ?? `${t.minQuantity}-dp`} className="flex items-center justify-between text-sm">
                          <span>{t.minQuantity}+ units</span>
                          <span className="font-bold">{t.discountPercentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!!product.deliveryTiers.length && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-2 flex items-center gap-2"><Truck size={12} /> Delivery Tiers</p>
                    <div className="space-y-2">
                      {product.deliveryTiers.map((t) => (
                        <div key={t.id ?? `${t.minQuantity}-dl`} className="flex items-center justify-between text-sm">
                          <span>{t.minQuantity}+ units</span>
                          <span className="font-bold">{t.deliveryDays} days</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-[#A1A1AA]">
                  <p>Created: {new Date(product.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(product.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Wanted Users Card */}
              {notifyingUsers && (
                <div className="bg-white border border-[#EEEEEE] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] flex items-center gap-2">
                      <Bell size={12} /> Wanted Users
                    </p>
                    {notifyingUsers.pending_notifications_count > 0 && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <Users size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-black">{notifyingUsers.notifying_users.length}</p>
                      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">
                        {notifyingUsers.notifying_users.length === 1 ? "User" : "Users"} clicked Notify Me
                      </p>
                    </div>
                  </div>

                  {notifyingUsers.notifying_users.length > 0 && (
                    <>
                      <div className="flex gap-3">
                        <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                          <p className="text-lg font-black text-amber-600">{notifyingUsers.pending_notifications_count}</p>
                          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Pending</p>
                        </div>
                        <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                          <p className="text-lg font-black text-emerald-600">
                            {notifyingUsers.notifying_users.length - notifyingUsers.pending_notifications_count}
                          </p>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Notified</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
                          <span>Notification progress</span>
                          <span>
                            {Math.round(
                              ((notifyingUsers.notifying_users.length - notifyingUsers.pending_notifications_count) /
                                notifyingUsers.notifying_users.length) *
                                100
                            )}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                ((notifyingUsers.notifying_users.length - notifyingUsers.pending_notifications_count) /
                                  notifyingUsers.notifying_users.length) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <a
                        href="#notifying-users-table"
                        className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <Users size={12} /> View all users ↓
                      </a>
                    </>
                  )}

                  {notifyingUsers.notifying_users.length === 0 && (
                    <p className="text-xs text-[#A1A1AA] text-center py-2">No users have requested notifications yet.</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Notifying Users Section */}
            {notifyingUsers && notifyingUsers.notifying_users.length > 0 && (
              <div id="notifying-users-table" className="bg-white border border-[#EEEEEE] rounded-2xl p-6 lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Users size={16} /> 
                    Users Waiting for Restock
                  </h3>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full uppercase border border-amber-200">
                    {notifyingUsers.pending_notifications_count} Pending
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EEEEEE] text-[10px] uppercase text-[#A1A1AA] tracking-widest">
                        <th className="pb-3 font-bold">User</th>
                        <th className="pb-3 font-bold">Contact</th>
                        <th className="pb-3 font-bold">Requested At</th>
                        <th className="pb-3 font-bold">Status</th>
                        <th className="pb-3 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {notifyingUsers.notifying_users.map(nu => (
                        <tr key={nu.id} className="border-b border-[#EEEEEE] last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-bold">{nu.user_name}</td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><Mail size={12} className="text-slate-400" /> {nu.user_email}</span>
                              {nu.user_phone && <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><Phone size={12} className="text-slate-400" /> {nu.user_phone}</span>}
                            </div>
                          </td>
                          <td className="py-3 text-xs font-medium text-slate-500">{new Date(nu.created_at).toLocaleDateString()}</td>
                          <td className="py-3">
                            {nu.notified ? (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">Notified</span>
                            ) : (
                              <span className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2 py-1 rounded-full border border-slate-200 uppercase tracking-wide">Pending</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <Link 
                              to={`/admin/users/${nu.user_id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wide rounded hover:bg-zinc-800 transition-colors"
                            >
                              View User
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media Lightbox */}
      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(i) => setLightbox(prev => prev ? { ...prev, index: i } : null)}
        />
      )}
    </div>
  );
};

export default ProductDetailsPage;
