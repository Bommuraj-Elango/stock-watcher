import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function BrowseStocks() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [buyStock, setBuyStock] = useState<any>(null);
  const [qty, setQty] = useState("1");

  const load = async () => {
    const { data } = await supabase.from("stocks").select("*").gt("available_quantity", 0).order("created_at", { ascending: false });
    setStocks(data || []);

    // Load company profiles
    const companyIds = [...new Set((data || []).map((s) => s.company_id))];
    if (companyIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", companyIds);
      const map: Record<string, any> = {};
      (profiles || []).forEach((p) => { map[p.user_id] = p; });
      setCompanies(map);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = stocks.filter((s) => {
    const q = search.toLowerCase();
    const companyName = companies[s.company_id]?.full_name?.toLowerCase() || "";
    return s.stock_name.toLowerCase().includes(q) || companyName.includes(q);
  });

  const handleBuy = async () => {
    if (!user || !buyStock) return;
    const quantity = parseInt(qty);
    if (isNaN(quantity) || quantity < 1) { toast.error("Invalid quantity"); return; }
    if (quantity > buyStock.available_quantity) { toast.error("Not enough stock available"); return; }

    const totalPrice = quantity * Number(buyStock.stock_price);

    // Insert transaction
    const { error: txnError } = await supabase.from("transactions").insert({
      buyer_id: user.id,
      stock_id: buyStock.id,
      company_id: buyStock.company_id,
      quantity,
      price_per_unit: Number(buyStock.stock_price),
      total_price: totalPrice,
    });
    if (txnError) { toast.error(txnError.message); return; }

    // Update stock available quantity
    await supabase.from("stocks").update({
      available_quantity: buyStock.available_quantity - quantity,
    }).eq("id", buyStock.id);

    // Update wallet
    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("user_id", user.id).single();
    if (profile) {
      await supabase.from("profiles").update({
        wallet_balance: Number(profile.wallet_balance) - totalPrice,
      }).eq("user_id", user.id);
    }

    toast.success(`Bought ${quantity} shares of ${buyStock.stock_name}!`);
    setBuyStock(null);
    setQty("1");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Browse Stocks</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by stock name or company..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((stock) => (
          <div key={stock.id} className="glass-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{stock.stock_name}</h3>
                {stock.profit_percentage > 0 && (
                  <span className="text-xs font-mono price-up bg-primary/10 px-2 py-0.5 rounded">+{stock.profit_percentage}%</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">{companies[stock.company_id]?.full_name || "Unknown Company"}</p>
              {stock.description && <p className="text-xs text-muted-foreground mb-3">{stock.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-xl font-bold">₹{Number(stock.stock_price).toLocaleString()}</span>
                <span className="text-muted-foreground">{stock.available_quantity} available</span>
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={() => setBuyStock(stock)}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Buy
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No stocks found</div>
        )}
      </div>

      {/* Buy Dialog */}
      <Dialog open={!!buyStock} onOpenChange={(v) => { if (!v) setBuyStock(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy {buyStock?.stock_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per unit</span>
                <span className="font-mono font-bold">₹{Number(buyStock?.stock_price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Available</span>
                <span className="font-mono">{buyStock?.available_quantity}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="1" max={buyStock?.available_quantity} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="glass-card p-4">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-bold text-primary">₹{(parseInt(qty || "0") * Number(buyStock?.stock_price || 0)).toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleBuy}>Confirm Purchase</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
