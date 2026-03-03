import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { transactionApi } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { ShoppingCart, DollarSign, TrendingUp, Wallet } from "lucide-react";

export default function BuyerDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ totalPurchases: 0, totalSpent: 0, uniqueStocks: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: txns } = await transactionApi.list({ buyerId: user.id });
      const totalPurchases = txns?.reduce((s, t) => s + t.quantity, 0) || 0;
      const totalSpent = txns?.reduce((s, t) => s + t.total_price, 0) || 0;
      const uniqueStocks = new Set(txns?.map((t) => t.stock_id)).size;
      setStats({ totalPurchases, totalSpent, uniqueStocks });
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buyer Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Wallet Balance" value={`₹${Number(profile?.wallet_balance || 0).toLocaleString()}`} icon={<Wallet className="h-5 w-5" />} />
        <StatCard title="Total Purchases" value={String(stats.totalPurchases)} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard title="Total Spent" value={`₹${stats.totalSpent.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Unique Stocks" value={String(stats.uniqueStocks)} icon={<TrendingUp className="h-5 w-5" />} trend="up" />
      </div>
    </div>
  );
}
