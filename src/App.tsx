import { Toaster } from "@/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Owner pages
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard";
import AutomaticLogs from "./pages/AutomaticLogs";
import ManualLogs from "./pages/ManualLogs";
import Comparison from "./pages/Comparison";
import Reports from "./pages/Reports";
import ManagerAccess from "./pages/ManagerAccess";
import PriceSettings from "./pages/PriceSettings";
import VehicleHistory from "./pages/VehicleHistory";
import OwnerEntry from "./pages/OwnerEntry";

// Manager pages
import ManagerPortal from "./pages/ManagerPortal";
import DashboardManager from "./pages/DashboardManager";
import ManagerLogs from "./pages/ManagerLogs";
import ManagerAutomaticLogs from "./pages/ManagerAutomaticLogs";
import ManagerManualLogs from "./pages/ManagerManualLogs";
import ManagerComparison from "./pages/ManagerComparison";
import ManagerReports from "./pages/ManagerReports";
import ManagerPriceSettings from "./pages/ManagerPriceSettings";
import ManagerVehicleHistory from "./pages/ManagerVehicleHistory";
import ManagerOwnerEntry from "./pages/ManagerOwnerEntry";

import NotFound from "./pages/NotFound";
import { Layout } from "@/components/layout/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Manager routes */}
            <Route 
              path="/manager-portal" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <DashboardManager />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-logs" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-automatic-logs" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerAutomaticLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-manual-logs" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerManualLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-comparison" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerComparison />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-reports" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerReports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-price-settings" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerPriceSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-vehicle-history" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerVehicleHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-owner-entry" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerOwnerEntry />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/automatic-logs" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <Layout>
                    <AutomaticLogs />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/automatic-logs" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Navigate to="/manager-automatic-logs" replace />
                </ProtectedRoute>
              } 
            />
            
            {/* Owner routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manual-logs" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <Layout>
                    <ManualLogs />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manual-logs" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Navigate to="/manager-manual-logs" replace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/comparison" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <Comparison />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/comparison" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Navigate to="/manager-comparison" replace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Navigate to="/manager-reports" replace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager-access" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <ManagerAccess />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/price-settings" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <PriceSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/price-settings" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Navigate to="/manager-price-settings" replace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/vehicle-history" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <VehicleHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/vehicle-history" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Navigate to="/manager-vehicle-history" replace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/owner-entry" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <OwnerEntry />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/owner-entry" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Navigate to="/manager-owner-entry" replace />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
