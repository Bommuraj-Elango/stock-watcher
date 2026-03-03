import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { profileApi, stockApi, transactionApi } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BuyerPortfolio() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, any>>({});
  const [companyMap, setCompanyMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: txns } = await transactionApi.list({ buyerId: user.id });
      setTransactions(txns || []);

      const stockIds = [...new Set((txns || []).map((t) => t.stock_id))];
      const companyIds = [...new Set((txns || []).map((t) => t.company_id))];

      if (stockIds.length > 0) {
        const { data: stocks } = await stockApi.list({ ids: stockIds });
        const map: Record<string, any> = {};
        (stocks || []).forEach((s) => { map[s.id] = s; });
        setStockMap(map);
      }
      if (companyIds.length > 0) {
        const { data: profiles } = await profileApi.list(companyIds);
        const map: Record<string, any> = {};
        (profiles || []).forEach((p) => { map[p.user_id] = p; });
        setCompanyMap(map);
      }
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Portfolio</h1>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price/Unit</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchases yet</TableCell></TableRow>
            ) : transactions.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="font-medium">{stockMap[txn.stock_id]?.stock_name || "—"}</TableCell>
                <TableCell>{companyMap[txn.company_id]?.full_name || "—"}</TableCell>
                <TableCell className="text-right font-mono">{txn.quantity}</TableCell>
                <TableCell className="text-right font-mono">₹{Number(txn.price_per_unit).toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono font-bold">₹{Number(txn.total_price).toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{new Date(txn.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
