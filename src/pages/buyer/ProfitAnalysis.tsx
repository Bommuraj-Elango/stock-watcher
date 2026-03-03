import { useEffect, useState } from "react";
import { profileApi, stockApi, transactionApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Trophy } from "lucide-react";

const COLORS = ["hsl(142,70%,45%)", "hsl(217,91%,60%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(280,65%,60%)"];

export default function ProfitAnalysis() {
  const [companyData, setCompanyData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: txns }, { data: stocks }, { data: profiles }] = await Promise.all([
        transactionApi.list(),
        stockApi.list(),
        profileApi.list(),
      ]);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p) => { profileMap[p.user_id] = p; });

      // Aggregate by company
      const companyStats: Record<string, { revenue: number; profit: number; name: string }> = {};
      (txns || []).forEach((t) => {
        if (!companyStats[t.company_id]) {
          companyStats[t.company_id] = { revenue: 0, profit: 0, name: profileMap[t.company_id]?.full_name || "Unknown" };
        }
        companyStats[t.company_id].revenue += t.total_price;
      });

      // Add average profit from stocks
      (stocks || []).forEach((s) => {
        if (companyStats[s.company_id]) {
          companyStats[s.company_id].profit = Math.max(companyStats[s.company_id].profit, Number(s.profit_percentage) || 0);
        }
      });

      const sorted = Object.values(companyStats).sort((a, b) => b.revenue - a.revenue);
      setCompanyData(sorted);
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-accent" /> Profit Analysis
      </h1>

      {companyData.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">No transaction data available yet</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Ranking Bar Chart */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Company Revenue Ranking</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={companyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
                <XAxis type="number" stroke="hsl(215,12%,50%)" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(215,12%,50%)" fontSize={12} width={100} />
                <Tooltip contentStyle={{ background: "hsl(220,18%,9%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px" }} />
                <Bar dataKey="revenue" fill="hsl(142,70%,45%)" radius={[0, 4, 4, 0]} name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Trend */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Profit Percentage by Company</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={companyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
                <XAxis dataKey="name" stroke="hsl(215,12%,50%)" fontSize={12} />
                <YAxis stroke="hsl(215,12%,50%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(220,18%,9%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="profit" stroke="hsl(38,92%,50%)" strokeWidth={2} name="Profit %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Share Pie */}
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Revenue Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={companyData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {companyData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220,18%,9%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
