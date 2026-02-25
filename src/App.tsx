import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import CompanyStocks from "./pages/company/CompanyStocks";
import CompanyAnalytics from "./pages/company/CompanyAnalytics";
import BrowseStocks from "./pages/buyer/BrowseStocks";
import BuyerPortfolio from "./pages/buyer/BuyerPortfolio";
import ProfitAnalysis from "./pages/buyer/ProfitAnalysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/stocks" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyStocks /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyAnalytics /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/browse" element={<ProtectedRoute requiredRole="buyer"><DashboardLayout><BrowseStocks /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/portfolio" element={<ProtectedRoute requiredRole="buyer"><DashboardLayout><BuyerPortfolio /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/analysis" element={<ProtectedRoute requiredRole="buyer"><DashboardLayout><ProfitAnalysis /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
