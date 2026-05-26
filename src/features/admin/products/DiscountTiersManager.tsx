import React, { useState, useEffect } from "react";
import { Trash2, Plus, AlertCircle, Loader2 } from "lucide-react";
import { tierApi } from "./tierApi";
import type { DiscountTierDto } from "./tierApi";

interface DiscountTiersManagerProps {
  productId: number;
  finalPrice: string | number;
  onTiersChange?: (tiers: DiscountTierDto[]) => void;
}

const DiscountTiersManager: React.FC<DiscountTiersManagerProps> = ({
  productId,
  finalPrice,
  onTiersChange,
}) => {
  const [tiers, setTiers] = useState<DiscountTierDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTier, setNewTier] = useState({
    min_quantity: 1,
    discount_percentage: 0,
  });

  // Fetch tiers on mount
  useEffect(() => {
    fetchTiers();
  }, [productId]);

  const fetchTiers = async () => {
    if (!productId) {
      setTiers([]);
      onTiersChange?.([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await tierApi.discountTiers.list(productId);
      const tiersData = response.results || [];
      setTiers(tiersData);
      // Notify parent of tier changes
      onTiersChange?.(tiersData);
      // console.log("Discount tiers fetched:", tiersData);
    } catch (err) {
      setError("Failed to load discount tiers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTier = async () => {
    if (!newTier.min_quantity || newTier.discount_percentage <= 0) {
      setError("Please fill in all fields with valid values");
      return;
    }

    if (newTier.discount_percentage > 100) {
      setError("Discount percentage cannot exceed 100%");
      return;
    }

    if (!productId) {
      const newLocalTier = {
        id: Date.now(),
        product: 0,
        min_quantity: newTier.min_quantity,
        discount_percentage: newTier.discount_percentage,
      };
      const updated = [...tiers, newLocalTier];
      setTiers(updated);
      onTiersChange?.(updated);
      setNewTier({ min_quantity: 1, discount_percentage: 0 });
      setError(null);
      return;
    }

    try {
      await tierApi.discountTiers.create({
        product: productId,
        min_quantity: newTier.min_quantity,
        discount_percentage: newTier.discount_percentage,
      });
      setNewTier({ min_quantity: 1, discount_percentage: 0 });
      setError(null);
      // Refetch to get the updated list from server
      await fetchTiers();
    } catch (err) {
      setError("Failed to add discount tier");
      console.error(err);
    }
  };

  const handleDeleteTier = async (id: number) => {
    if (!productId) {
      const updated = tiers.filter((t: any) => t.id !== id);
      setTiers(updated);
      onTiersChange?.(updated);
      return;
    }

    try {
      await tierApi.discountTiers.delete(id);
      setError(null);
      // Refetch to get the updated list from server
      await fetchTiers();
    } catch (err) {
      setError("Failed to delete discount tier");
      console.error(err);
    }
  };

  const calculateDiscountedPrice = (discountPercent: number): number => {
    const price = parseFloat(String(finalPrice));
    return price - (price * discountPercent) / 100;
  };

  return (
    <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Quantity-Based Discounts
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Existing Tiers List */}
      {tiers.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">
                  Min Quantity
                </th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">
                  Discount %
                </th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">
                  Unit Price After Discount
                </th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr
                  key={tier.id}
                  className="border-b border-gray-200 hover:bg-white transition"
                >
                  <td className="py-2 px-3">{tier.min_quantity}</td>
                  <td className="py-2 px-3">{tier.discount_percentage}%</td>
                  <td className="py-2 px-3 font-semibold text-cyan-600">
                    {calculateDiscountedPrice(tier.discount_percentage).toFixed(2)}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => tier.id && handleDeleteTier(tier.id)}
                      className="text-red-600 hover:text-red-700 transition disabled:opacity-50"
                      title="Delete"
                      type="button"
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Tier */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Add New Discount Tier</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Min Quantity
            </label>
            <input
              type="number"
              value={newTier.min_quantity}
              onChange={(e) =>
                setNewTier({
                  ...newTier,
                  min_quantity: parseInt(e.target.value) || 0,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Discount %
            </label>
            <input
              type="number"
              value={newTier.discount_percentage}
              onChange={(e) =>
                setNewTier({
                  ...newTier,
                  discount_percentage: parseFloat(e.target.value) || 0,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              step="0.01"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Price After Discount
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold text-cyan-600">
              {calculateDiscountedPrice(newTier.discount_percentage).toFixed(2)}
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddTier}
              disabled={loading}
              className="w-full bg-cyan-600 text-white font-semibold py-2 rounded-lg hover:bg-cyan-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              type="button"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Tier
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Loading...
        </div>
      )}
    </div>
  );
};

export default DiscountTiersManager;
