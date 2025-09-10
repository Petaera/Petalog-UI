import { Toaster } from "@/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NetworkErrorBoundary from "@/components/NetworkErrorBoundary";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

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
import ManagerSettings from "./pages/ManagerSettings";

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
import WorkerManualEntry from "./pages/WorkerManualEntry";
import LocationPartnershipsPage from "./pages/LocationPartnershipsPage";

import NotFound from "./pages/NotFound";
import { Layout } from "@/components/layout/Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App = () => (
  <NetworkErrorBoundary>
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
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              
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
                    <Layout>
                      <ManagerManualLogs />
                    </Layout>
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
                    <Layout>
                      <ManagerOwnerEntry />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Worker routes */}
              <Route 
                path="/worker-portal" 
                element={
                  <ProtectedRoute requiredRole="worker">
                    <Layout>
                      <WorkerManualEntry />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/worker-manual-entry" 
                element={
                  <ProtectedRoute requiredRole="worker">
                    <Layout>
                      <WorkerManualEntry />
                    </Layout>
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
              
              {/* Owner routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <Dashboard />
                    </Layout>
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
                path="/comparison" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <Comparison />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/manager-access" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <ManagerAccess />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/price-settings" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <PriceSettings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/vehicle-history" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <VehicleHistory />
                    </Layout>
                  </ProtectedRoute>
                }
              />
                             <Route 
                 path="/owner-entry" 
                 element={
                   <ProtectedRoute requiredRole="owner">
                     <Layout>
                       <OwnerEntry />
                     </Layout>
                   </ProtectedRoute>
                 }
               />
               
               <Route 
                 path="/location-partnerships" 
                 element={
                   <ProtectedRoute requiredRole={["owner", "manager"]}>
                     <LocationPartnershipsPage />
                   </ProtectedRoute>
                 }
               />
               
               <Route 
                 path="/manager-settings" 
                 element={
                   <ProtectedRoute requiredRole="owner">
                     <ManagerSettings />
                   </ProtectedRoute>
                 } 
               />
              
              <Route 
                path="/manager-settings/staff" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <ManagerSettings />
                  </ProtectedRoute>
                } 
              />
              
              <Route
                path="/manager-settings/daily-attendance"
                element={
                  <ProtectedRoute requiredRole="owner">
                    <ManagerSettings />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/manager-settings/expenses"
                element={
                  <ProtectedRoute requiredRole="owner">
                    <ManagerSettings />
                  </ProtectedRoute>
                }
              />
              
              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </NetworkErrorBoundary>
);

export default App;
