import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { stockApi, transactionApi } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { Package, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalStocks: 0, totalSold: 0, revenue: 0, avgProfit: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: stocks }, { data: txns }] = await Promise.all([
        stockApi.list({ companyId: user.id }),
        transactionApi.list({ companyId: user.id }),
      ]);

      const totalStocks = stocks?.length || 0;
      const totalSold = txns?.reduce((s, t) => s + t.quantity, 0) || 0;
      const revenue = txns?.reduce((s, t) => s + t.total_price, 0) || 0;
      const avgProfit = stocks?.length
        ? stocks.reduce((s, st) => s + (st.profit_percentage || 0), 0) / stocks.length
        : 0;

      setStats({ totalStocks, totalSold, revenue, avgProfit });
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Company Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Stocks" value={String(stats.totalStocks)} icon={<Package className="h-5 w-5" />} />
        <StatCard title="Stocks Sold" value={String(stats.totalSold)} icon={<TrendingUp className="h-5 w-5" />} trend="up" />
        <StatCard title="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} trend="up" />
        <StatCard title="Avg Profit %" value={`${stats.avgProfit.toFixed(1)}%`} icon={<BarChart3 className="h-5 w-5" />} trend={stats.avgProfit > 0 ? "up" : "neutral"} />
      </div>
    </div>
  );
}
