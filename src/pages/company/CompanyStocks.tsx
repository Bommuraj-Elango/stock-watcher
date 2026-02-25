import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StockForm {
  stock_name: string;
  stock_price: string;
  total_quantity: string;
  profit_percentage: string;
  description: string;
}

const emptyForm: StockForm = { stock_name: "", stock_price: "", total_quantity: "", profit_percentage: "", description: "" };

export default function CompanyStocks() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<any[]>([]);
  const [form, setForm] = useState<StockForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("stocks").select("*").eq("company_id", user.id).order("created_at", { ascending: false });
    setStocks(data || []);
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      company_id: user.id,
      stock_name: form.stock_name.trim(),
      stock_price: parseFloat(form.stock_price),
      total_quantity: parseInt(form.total_quantity),
      available_quantity: parseInt(form.total_quantity),
      profit_percentage: form.profit_percentage ? parseFloat(form.profit_percentage) : 0,
      description: form.description,
    };

    if (editId) {
      const { available_quantity: _, company_id: __, ...updatePayload } = payload;
      const { error } = await supabase.from("stocks").update(updatePayload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Stock updated");
    } else {
      const { error } = await supabase.from("stocks").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Stock added");
    }
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    load();
  };

  const handleEdit = (stock: any) => {
    setForm({
      stock_name: stock.stock_name,
      stock_price: String(stock.stock_price),
      total_quantity: String(stock.total_quantity),
      profit_percentage: String(stock.profit_percentage || ""),
      description: stock.description || "",
    });
    setEditId(stock.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("stocks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Stock deleted");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Stocks</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Stock</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Stock" : "Add New Stock"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Stock Name</Label>
                <Input value={form.stock_name} onChange={(e) => setForm({ ...form, stock_name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input type="number" step="0.01" value={form.stock_price} onChange={(e) => setForm({ ...form, stock_price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Profit % (optional)</Label>
                <Input type="number" step="0.1" value={form.profit_percentage} onChange={(e) => setForm({ ...form, profit_percentage: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Add"} Stock</Button>
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
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No stocks yet. Add your first stock!</TableCell></TableRow>
            ) : stocks.map((stock) => (
              <TableRow key={stock.id}>
                <TableCell className="font-medium">{stock.stock_name}</TableCell>
                <TableCell className="text-right font-mono">₹{Number(stock.stock_price).toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{stock.available_quantity}</TableCell>
                <TableCell className="text-right font-mono">{stock.total_quantity}</TableCell>
                <TableCell className={`text-right font-mono ${Number(stock.profit_percentage) > 0 ? "price-up" : ""}`}>
                  {stock.profit_percentage ? `${stock.profit_percentage}%` : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(stock)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(stock.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
