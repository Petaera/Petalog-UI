

import { Toaster } from "@/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NetworkErrorBoundary from "@/components/NetworkErrorBoundary";
import { useState } from "react";

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
import PayLater from "./pages/PayLater";
import Comparison from "./pages/Comparison";
import Reports from "./pages/Reports";
import PaymentDetails from "./pages/paymentdetails";
import ManagerAccess from "./pages/ManagerAccess";
import PriceSettings from "./pages/PriceSettings";
import VehicleHistory from "./pages/VehicleHistory";
import OwnerEntry from "./pages/OwnerEntry";
import ManagerSettings from "./pages/ManagerSettings";
import Loyalty from "./pages/Loyalty";
import { DashboardOverview } from "./components/loyalty/DashboardOverview";
import { SubscriptionSchemes } from "./components/loyalty/SubscriptionSchemes";
import { CreateSchemeWizard } from "./components/loyalty/CreateSchemeWizard";
import { Customers } from "./components/loyalty/Customers";
import { Analytics } from "./components/loyalty/Analytics";
import { LoyaltyLayout } from "./components/loyalty/LoyaltyLayout";

// Payroll pages
import PayrollLayout from "./components/layout/PayrollLayout";
import PayrollDashboard from "./pages/payroll_pages/Dashboard";
import PayrollStaffPage from "./pages/payroll_pages/StaffPage";
import PayrollAttendancePage from "./pages/payroll_pages/AttendancePage";
import PayrollExpensesPage from "./pages/payroll_pages/ExpensesPage";
import PayrollReportsPage from "./pages/payroll_pages/ReportsPage";
import PayrollSettingsPage from "./pages/payroll_pages/SettingsPage";
import { ProtectedPayrollRoute } from "./components/ProtectedPayrollRoute";

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
import { ProfileSettings } from "./pages/ProfileSettings";

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

const App = () => {
  const [selectedLocation,setSelectedLocation] = useState("");
  return (
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
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
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
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
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
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <WorkerManualEntry />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/worker-manual-entry" 
                element={
                  <ProtectedRoute requiredRole="worker">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <WorkerManualEntry />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
                             <Route 
                 path="/automatic-logs" 
                 element={
                   <ProtectedRoute requiredRole="owner">
                     <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
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
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/manual-logs" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <ManualLogs />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/pay-later" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <PayLater />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/comparison" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <Comparison />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/payment-details" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <PaymentDetails />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/manager-access" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <ManagerAccess />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/price-settings" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <PriceSettings locationId={selectedLocation}/>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/vehicle-history" 
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                      <VehicleHistory />
                    </Layout>
                  </ProtectedRoute>
                }
              />
                             <Route 
                 path="/owner-entry" 
                 element={
                   <ProtectedRoute requiredRole="owner">
                     <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                       <OwnerEntry />
                     </Layout>
                   </ProtectedRoute>
                 }
               />
               
               {/* Loyalty Routes */}
               <Route 
                 path="/loyalty" 
                 element={
                   <ProtectedRoute requiredRole={["owner", "manager"]}>
                     <LoyaltyLayout />
                   </ProtectedRoute>
                 }
               >
                 <Route index element={<DashboardOverview />} />
                 <Route path="dashboard" element={<DashboardOverview />} />
                 <Route path="schemes" element={<SubscriptionSchemes />} />
                 <Route path="create" element={<CreateSchemeWizard onComplete={() => {}} />} />
                 <Route path="edit/:id" element={<CreateSchemeWizard onComplete={() => {}} />} />
                 <Route path="customers" element={<Customers />} />
                 <Route path="analytics" element={<Analytics />} />
               </Route>
               
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
                 path="/profileSettings" 
                 element={
                   <ProtectedRoute requiredRole="owner">
                     <Layout selectedLocation={selectedLocation} onLocationChange={setSelectedLocation}>
                       <ProfileSettings />
                     </Layout>
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
              
              {/* Payroll Routes */}
              <Route 
                path="/payroll" 
                element={
                  <ProtectedRoute requiredRole={["owner", "manager"]}>
                    <PayrollLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<PayrollDashboard />} />
                <Route path="dashboard" element={<PayrollDashboard />} />
                <Route path="staff" element={<PayrollStaffPage />} />
                <Route path="attendance" element={<PayrollAttendancePage />} />
                <Route path="expenses" element={<PayrollExpensesPage />} />
                <Route 
                  path="reports" 
                  element={
                    <ProtectedPayrollRoute allowedRoles={["owner"]}>
                      <PayrollReportsPage />
                    </ProtectedPayrollRoute>
                  } 
                />
                <Route 
                  path="settings" 
                  element={
                    <ProtectedPayrollRoute allowedRoles={["owner"]}>
                      <PayrollSettingsPage />
                    </ProtectedPayrollRoute>
                  } 
                />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </NetworkErrorBoundary>
)};

export default App;