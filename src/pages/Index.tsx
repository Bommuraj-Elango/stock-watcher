import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate("/dashboard");
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-stock-blue/5" />
      <div className="relative z-10 text-center max-w-2xl animate-slide-up">
        <div className="inline-flex items-center gap-3 mb-6">
          <TrendingUp className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold tracking-tight">StockVista</h1>
        </div>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Professional stock market analysis platform. Manage, trade, and analyze stocks with real-time insights.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
