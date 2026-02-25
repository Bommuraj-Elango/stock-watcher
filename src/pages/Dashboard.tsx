import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import CompanyDashboard from "./company/CompanyDashboard";
import BuyerDashboard from "./buyer/BuyerDashboard";

export default function Dashboard() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role) return <Navigate to="/auth" />;
  return role === "company" ? <CompanyDashboard /> : <BuyerDashboard />;
}
