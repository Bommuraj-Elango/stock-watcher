import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { stockApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StockForm {
  security_name: string;
  stock_symbol: string;
  sector: string;
  currency: string;
  current_market_price: string;
  volume: string;
  market_capitalization: string;
  price_to_earnings_ratio: string;
  dividend_yield_percentage: string;
  eps: string;
  roe: string;
  rsi: string;
  ma_50: string;
  ma_200: string;
  day_high: string;
  day_low: string;
  fifty_two_week_high: string;
  fifty_two_week_low: string;
  tags: string;
  listed_exchanges: string;
  major_shareholders: string;
  dividend_history: string;
  total_listed_quantity: string;
  available_trading_quantity: string;
  is_trading_active: boolean;
  profit_percentage: string;
  description: string;
}

const emptyForm: StockForm = {
  security_name: "",
  stock_symbol: "",
  sector: "",
  currency: "INR",
  current_market_price: "",
  volume: "",
  market_capitalization: "",
  price_to_earnings_ratio: "",
  dividend_yield_percentage: "",
  eps: "",
  roe: "",
  rsi: "",
  ma_50: "",
  ma_200: "",
  day_high: "",
  day_low: "",
  fifty_two_week_high: "",
  fifty_two_week_low: "",
  tags: "",
  listed_exchanges: "",
  major_shareholders: "",
  dividend_history: "",
  total_listed_quantity: "",
  available_trading_quantity: "",
  is_trading_active: true,
  profit_percentage: "",
  description: "",
};

export default function CompanyStocks() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<any[]>([]);
  const [form, setForm] = useState<StockForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await stockApi.list({ companyId: user.id });
    setStocks(data || []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const totalQuantity = parseInt(form.total_listed_quantity, 10);
      const availableTradingQuantity = form.available_trading_quantity
        ? parseInt(form.available_trading_quantity, 10)
        : totalQuantity;
      const currentMarketPrice = parseFloat(form.current_market_price);
      const marketCapitalization = parseFloat(form.market_capitalization);
      const peRatio = form.price_to_earnings_ratio ? parseFloat(form.price_to_earnings_ratio) : 0;
      const dividendYield = form.dividend_yield_percentage ? parseFloat(form.dividend_yield_percentage) : 0;
      const payload = {
        company_id: user.id,
        issuing_company_id: user.id,
        security_name: form.security_name.trim(),
        stock_name: form.security_name.trim(),
        stock_symbol: form.stock_symbol.trim(),
        sector: form.sector.trim(),
        currency: form.currency.trim(),
        current_market_price: currentMarketPrice,
        current_price: currentMarketPrice,
        stock_price: currentMarketPrice,
        volume: parseInt(form.volume, 10),
        market_capitalization: marketCapitalization,
        market_cap: marketCapitalization,
        price_to_earnings_ratio: peRatio,
        pe_ratio: peRatio,
        dividend_yield_percentage: dividendYield,
        eps: form.eps ? parseFloat(form.eps) : 0,
        roe: form.roe ? parseFloat(form.roe) : 0,
        rsi: form.rsi ? parseFloat(form.rsi) : 0,
        ma_50: form.ma_50 ? parseFloat(form.ma_50) : 0,
        ma_200: form.ma_200 ? parseFloat(form.ma_200) : 0,
        day_high: form.day_high ? parseFloat(form.day_high) : 0,
        day_low: form.day_low ? parseFloat(form.day_low) : 0,
        fifty_two_week_high: form.fifty_two_week_high ? parseFloat(form.fifty_two_week_high) : 0,
        week_52_high: form.fifty_two_week_high ? parseFloat(form.fifty_two_week_high) : 0,
        fifty_two_week_low: form.fifty_two_week_low ? parseFloat(form.fifty_two_week_low) : 0,
        week_52_low: form.fifty_two_week_low ? parseFloat(form.fifty_two_week_low) : 0,
        tags: form.tags,
        listed_exchanges: form.listed_exchanges,
        major_shareholders: form.major_shareholders,
        dividend_history: form.dividend_history,
        is_trading_active: form.is_trading_active,
        is_active: form.is_trading_active,
        total_listed_quantity: totalQuantity,
        total_quantity: totalQuantity,
        available_trading_quantity: availableTradingQuantity,
        available_quantity: availableTradingQuantity,
        profit_percentage: form.profit_percentage ? parseFloat(form.profit_percentage) : 0,
        price_history: [{ recorded_price: currentMarketPrice }],
        market_metrics: {
          market_capitalization: marketCapitalization,
          price_to_earnings_ratio: peRatio,
          dividend_yield_percentage: dividendYield,
          fifty_two_week_high: form.fifty_two_week_high ? parseFloat(form.fifty_two_week_high) : 0,
          fifty_two_week_low: form.fifty_two_week_low ? parseFloat(form.fifty_two_week_low) : 0,
        },
        trading_activity_log: [],
        description: form.description,
      };

      if (editId) {
        const { available_quantity: _unused, company_id: _companyId, ...updatePayload } = payload;
        await stockApi.update(editId, updatePayload);
        toast.success("Stock updated");
      } else {
        await stockApi.create(payload);
        toast.success("Stock added");
      }
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Unable to save stock");
    }
  };

  const handleEdit = (stock: any) => {
    setForm({
      security_name: stock.security_name || stock.stock_name || "",
      stock_symbol: stock.stock_symbol || "",
      sector: stock.sector || "",
      currency: stock.currency || "INR",
      current_market_price: String(stock.current_market_price ?? stock.current_price ?? stock.stock_price ?? ""),
      volume: String(stock.volume ?? ""),
      market_capitalization: String(stock.market_metrics?.market_capitalization ?? stock.market_cap ?? ""),
      price_to_earnings_ratio: String(stock.market_metrics?.price_to_earnings_ratio ?? stock.pe_ratio ?? ""),
      dividend_yield_percentage: String(stock.market_metrics?.dividend_yield_percentage ?? ""),
      eps: String(stock.eps ?? ""),
      roe: String(stock.roe ?? ""),
      rsi: String(stock.rsi ?? ""),
      ma_50: String(stock.ma_50 ?? ""),
      ma_200: String(stock.ma_200 ?? ""),
      day_high: String(stock.day_high ?? ""),
      day_low: String(stock.day_low ?? ""),
      fifty_two_week_high: String(stock.market_metrics?.fifty_two_week_high ?? stock.week_52_high ?? ""),
      fifty_two_week_low: String(stock.market_metrics?.fifty_two_week_low ?? stock.week_52_low ?? ""),
      tags: Array.isArray(stock.tags) ? stock.tags.join(", ") : "",
      listed_exchanges: Array.isArray(stock.listed_exchanges) ? stock.listed_exchanges.join(", ") : "",
      major_shareholders: stock.major_shareholders || "",
      dividend_history: stock.dividend_history || "",
      total_listed_quantity: String(stock.total_listed_quantity ?? stock.total_quantity ?? stock.volume ?? ""),
      available_trading_quantity: String(stock.available_trading_quantity ?? stock.available_quantity ?? ""),
      is_trading_active: stock.is_trading_active ?? stock.is_active ?? true,
      profit_percentage: String(stock.profit_percentage ?? ""),
      description: stock.description || "",
    });
    setEditId(stock.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await stockApi.remove(id);
      toast.success("Stock deleted");
      load();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Stocks</h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditId(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Stock" : "Add New Stock"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Basic Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Security Name *</Label>
                  <Input
                    value={form.security_name}
                    onChange={(e) => setForm({ ...form, security_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock Symbol *</Label>
                  <Input
                    value={form.stock_symbol}
                    onChange={(e) => setForm({ ...form, stock_symbol: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sector *</Label>
                  <Input
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    required
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Current Market Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.current_market_price}
                    onChange={(e) => setForm({ ...form, current_market_price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume *</Label>
                  <Input
                    type="number"
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Market Capitalization *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.market_capitalization}
                    onChange={(e) => setForm({ ...form, market_capitalization: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price to Earnings Ratio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price_to_earnings_ratio}
                    onChange={(e) => setForm({ ...form, price_to_earnings_ratio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dividend Yield %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.dividend_yield_percentage}
                    onChange={(e) => setForm({ ...form, dividend_yield_percentage: e.target.value })}
                  />
                </div>
              </div>

              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Technical Indicators</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>EPS</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.eps}
                    onChange={(e) => setForm({ ...form, eps: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>ROE (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.roe}
                    onChange={(e) => setForm({ ...form, roe: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RSI (0-100)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.rsi}
                    onChange={(e) => setForm({ ...form, rsi: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MA 50</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.ma_50}
                    onChange={(e) => setForm({ ...form, ma_50: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>MA 200</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.ma_200}
                    onChange={(e) => setForm({ ...form, ma_200: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day High</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.day_high}
                    onChange={(e) => setForm({ ...form, day_high: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day Low</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.day_low}
                    onChange={(e) => setForm({ ...form, day_low: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>52 Week High</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.fifty_two_week_high}
                    onChange={(e) => setForm({ ...form, fifty_two_week_high: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>52 Week Low</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.fifty_two_week_low}
                    onChange={(e) => setForm({ ...form, fifty_two_week_low: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Listed Exchanges (comma-separated)</Label>
                  <Input
                    value={form.listed_exchanges}
                    onChange={(e) => setForm({ ...form, listed_exchanges: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Major Shareholders</Label>
                  <Textarea
                    value={form.major_shareholders}
                    onChange={(e) => setForm({ ...form, major_shareholders: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dividend History</Label>
                  <Textarea
                    value={form.dividend_history}
                    onChange={(e) => setForm({ ...form, dividend_history: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Total Listed Quantity *</Label>
                  <Input
                    type="number"
                    value={form.total_listed_quantity}
                    onChange={(e) => setForm({ ...form, total_listed_quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available Trading Quantity *</Label>
                  <Input
                    type="number"
                    value={form.available_trading_quantity}
                    onChange={(e) => setForm({ ...form, available_trading_quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Is Trading Active</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.is_trading_active ? "true" : "false"}
                    onChange={(e) => setForm({ ...form, is_trading_active: e.target.value === "true" })}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Other Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Profit % (optional)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.profit_percentage}
                    onChange={(e) => setForm({ ...form, profit_percentage: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editId ? "Update" : "Add"} Stock
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Profit %</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No stocks yet. Add your first stock!
                </TableCell>
              </TableRow>
            ) : (
              stocks.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell className="font-medium">{stock.security_name || stock.stock_name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(stock.current_market_price ?? stock.stock_price).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stock.available_trading_quantity ?? stock.available_quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono">{stock.total_listed_quantity ?? stock.total_quantity}</TableCell>
                  <TableCell
                    className={`text-right font-mono ${Number(stock.profit_percentage) > 0 ? "price-up" : ""}`}
                  >
                    {stock.profit_percentage ? `${stock.profit_percentage}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(stock)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(stock.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
