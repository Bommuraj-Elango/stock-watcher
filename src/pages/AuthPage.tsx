import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Building2, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type AppRole = "company" | "buyer";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [selectedRole, setSelectedRole] = useState<AppRole>("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(email, password, fullName, selectedRole, { industry, description });
      toast.success("Account created! Redirecting...");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-stock-blue/5" />
        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="inline-flex items-center gap-3 mb-4">
            <TrendingUp className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">StockVista</h1>
          </div>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Your professional stock market analysis platform. Track, trade, and grow your portfolio.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-8">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-primary">₹2.4Cr</p>
              <p className="text-xs text-muted-foreground mt-1">Volume Traded</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-stock-green">+12.5%</p>
              <p className="text-xs text-muted-foreground mt-1">Avg Returns</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-stock-blue">500+</p>
              <p className="text-xs text-muted-foreground mt-1">Active Stocks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 lg:hidden mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">StockVista</span>
            </div>
            <CardTitle className="text-2xl">
              {activeTab === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {activeTab === "login" ? "Sign in to your dashboard" : "Join StockVista today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Role Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("buyer")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRole === "buyer"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <User className="h-5 w-5 mb-2" />
                      <p className="font-semibold text-sm">Buyer</p>
                      <p className="text-xs text-muted-foreground">Trade stocks</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("company")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRole === "company"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <Building2 className="h-5 w-5 mb-2" />
                      <p className="font-semibold text-sm">Company</p>
                      <p className="text-xs text-muted-foreground">List stocks</p>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label>{selectedRole === "company" ? "Company Name" : "Full Name"}</Label>
                    <Input placeholder={selectedRole === "company" ? "Acme Corp" : "John Doe"} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>

                  {selectedRole === "company" && (
                    <>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input placeholder="Technology, Finance..." value={industry} onChange={(e) => setIndustry(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="Brief company description" value={description} onChange={(e) => setDescription(e.target.value)} />
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
