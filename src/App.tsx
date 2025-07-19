
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
import Index from "./pages/Index";
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

import NotFound from "./pages/NotFound";

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
                  <ManagerPortal />
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
              path="/automatic-logs" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <AutomaticLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manual-logs" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <ManualLogs />
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
              path="/reports" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <Reports />
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
              path="/vehicle-history" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <VehicleHistory />
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
            
            {/* Catch-all routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
