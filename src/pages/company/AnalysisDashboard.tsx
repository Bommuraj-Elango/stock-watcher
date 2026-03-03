import { useEffect, useMemo, useState } from "react";
import { analysisApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DashboardData = {
  market_overview: {
    total_market_capitalization: number;
    average_market_price: number;
  };
  stock_rankings: any[];
  top_5_stocks: any[];
  investor_portfolio: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  filters: {
    min_price?: number;
    max_price?: number;
  };
};

export default function AnalysisDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const load = async (targetPage: number) => {
    setLoading(true);
    try {
      const min = minPrice.trim() === "" ? undefined : Number(minPrice);
      const max = maxPrice.trim() === "" ? undefined : Number(maxPrice);
      const res = await analysisApi.dashboard({
        page: targetPage,
        limit: 10,
        minPrice: Number.isFinite(min as number) ? min : undefined,
        maxPrice: Number.isFinite(max as number) ? max : undefined,
      });
      setData(res.data);
      setPage(targetPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const overview = data?.market_overview || {
    total_market_capitalization: 0,
    average_market_price: 0,
  };

  const pageSummary = useMemo(() => {
    const p = data?.pagination;
    if (!p) return "Page 1";
    return `Page ${p.page} of ${p.total_pages} (${p.total} total)`;
  }, [data]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analysis Dashboard</h1>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-2 text-lg font-semibold">Market Overview</h2>
          <p className="text-sm text-muted-foreground">Total Market Capitalization</p>
          <p className="text-2xl font-mono font-bold">
            {Number(overview.total_market_capitalization || 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-5">
          <h2 className="mb-2 text-lg font-semibold">Average Market Price</h2>
          <p className="text-sm text-muted-foreground">Computed from listed securities</p>
          <p className="text-2xl font-mono font-bold">{Number(overview.average_market_price || 0).toFixed(2)}</p>
        </div>
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Price Filter</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Min Price</Label>
            <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="e.g. 100" />
          </div>
          <div className="space-y-2">
            <Label>Max Price</Label>
            <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="e.g. 1000" />
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <Button onClick={() => load(1)} disabled={loading}>Apply Filter</Button>
            <Button
              variant="outline"
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setTimeout(() => load(1), 0);
              }}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Stock Rankings</h2>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2">Security Name</th>
                  <th className="pb-2 text-right">Market Price</th>
                  <th className="pb-2 text-right">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {(data?.stock_rankings || []).map((s, i) => (
                  <tr key={`${s.security_name}-${i}`} className="border-t border-border/50">
                    <td className="py-2">{s.security_name || "-"}</td>
                    <td className="py-2 text-right font-mono">{Number(s.current_market_price || 0).toLocaleString()}</td>
                    <td className="py-2 text-right font-mono">
                      {Number(s.market_metrics?.market_capitalization || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Top 5 Stocks</h2>
          <div className="space-y-2">
            {(data?.top_5_stocks || []).map((s, i) => (
              <div key={`${s.security_name}-${i}`} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                <span>{s.security_name || "-"}</span>
                <span className="font-mono">{Number(s.current_market_price || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Investor Portfolio</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2">Security Name</th>
                <th className="pb-2 text-right">Market Price</th>
                <th className="pb-2 text-right">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {(data?.investor_portfolio || []).length === 0 ? (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={3}>
                    No matching holdings found in trading activity.
                  </td>
                </tr>
              ) : (
                (data?.investor_portfolio || []).map((s, i) => (
                  <tr key={`${s.security_name}-${i}`} className="border-t border-border/50">
                    <td className="py-2">{s.security_name || "-"}</td>
                    <td className="py-2 text-right font-mono">{Number(s.current_market_price || 0).toLocaleString()}</td>
                    <td className="py-2 text-right font-mono">
                      {Number(s.market_metrics?.market_capitalization || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Paginated Results</h2>
        <p className="mb-4 text-sm text-muted-foreground">{pageSummary}</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={loading || page <= 1} onClick={() => load(page - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={loading || !data?.pagination || page >= data.pagination.total_pages}
            onClick={() => load(page + 1)}
          >
            Next
          </Button>
        </div>
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Evaluation Table</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2">Concept</th>
                <th className="pb-2">Where Used</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/50"><td className="py-2">Aggregation</td><td className="py-2">Market Overview</td></tr>
              <tr className="border-t border-border/50"><td className="py-2">Nested Query</td><td className="py-2">Investor Portfolio</td></tr>
              <tr className="border-t border-border/50"><td className="py-2">Projection</td><td className="py-2">Company Overview</td></tr>
              <tr className="border-t border-border/50"><td className="py-2">Sort</td><td className="py-2">Rankings</td></tr>
              <tr className="border-t border-border/50"><td className="py-2">Limit</td><td className="py-2">Top 5 Stocks</td></tr>
              <tr className="border-t border-border/50"><td className="py-2">Skip</td><td className="py-2">Pagination</td></tr>
              <tr className="border-t border-border/50"><td className="py-2">AND Query</td><td className="py-2">Price Filter</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
