import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(142,70%,45%)", "hsl(217,91%,60%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(280,65%,60%)"];

export default function CompanyAnalytics() {
  const { user } = useAuth();
  const [stockData, setStockData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: stocks } = await supabase.from("stocks").select("*").eq("company_id", user.id);
      const { data: txns } = await supabase.from("transactions").select("*").eq("company_id", user.id);

      // Stock distribution
      setStockData(
        (stocks || []).map((s) => ({
          name: s.stock_name,
          available: s.available_quantity,
          sold: s.total_quantity - s.available_quantity,
          price: Number(s.stock_price),
        }))
      );

      // Revenue by date
      const byDate: Record<string, number> = {};
      (txns || []).forEach((t) => {
        const date = new Date(t.created_at).toLocaleDateString();
        byDate[date] = (byDate[date] || 0) + t.total_price;
      });
      setRevenueData(Object.entries(byDate).map(([date, revenue]) => ({ date, revenue })));
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Stock Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
              <XAxis dataKey="name" stroke="hsl(215,12%,50%)" fontSize={12} />
              <YAxis stroke="hsl(215,12%,50%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,9%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px" }} />
              <Bar dataKey="available" fill="hsl(142,70%,45%)" name="Available" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sold" fill="hsl(217,91%,60%)" name="Sold" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          {revenueData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No transactions yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
                <XAxis dataKey="date" stroke="hsl(215,12%,50%)" fontSize={12} />
                <YAxis stroke="hsl(215,12%,50%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(220,18%,9%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(142,70%,45%)" strokeWidth={2} dot={{ fill: "hsl(142,70%,45%)" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Price Distribution Pie */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Stock Price Distribution</h3>
          {stockData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No stocks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={stockData} dataKey="price" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                  {stockData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220,18%,9%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
