import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Home,
  Database,
  PenTool,
  FileText,
  BarChart3,
  Users,
  Settings,
  Search,
  Car,
  Gift,
  Calculator,
  Calendar,
  CreditCard
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContext";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { supabase } from "@/lib/supabaseClient";

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const selectedLocationId = useSelectedLocation();
  const [locationLogo, setLocationLogo] = useState<string | null>(null);

  const isManager = user?.role === 'manager';
  const isWorker = user?.role === 'worker';

  const isActive = (path: string) => currentPath === path;

  const getNavClassName = (path: string) => {
    return isActive(path) ? "nav-item-active" : "nav-item-inactive";
  };

  const handleNavigationClick = () => {
    // Close the mobile sidebar when a navigation item is clicked
    setOpenMobile(false);
  };

  // Fetch location-specific logo
  // Priority: Location custom logo > Default logo
  useEffect(() => {
    const fetchLocationLogo = async () => {
      if (!selectedLocationId) {
        setLocationLogo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('locations')
          .select('logo_url')
          .eq('id', selectedLocationId)
          .single();

        // If location has a custom logo, use it; otherwise use null (which will fallback to default)
        if (!error && data?.logo_url) {
          setLocationLogo(data.logo_url);
        } else {
          setLocationLogo(null);
        }
      } catch (error) {
        console.error('Error fetching location logo:', error);
        setLocationLogo(null);
      }
    };

    fetchLocationLogo();
  }, [selectedLocationId]);

  const navigationItems = isWorker
    ? [
        { title: "Manual Entry", url: "/worker-manual-entry", icon: Car },
      ]
    : isManager
    ? [
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Manual Entry", url: "/manager-owner-entry", icon: Car },
        { title: "Manual Logs", url: "/manager-manual-logs", icon: PenTool },
        { title: "Loyalty", url: "/loyalty", icon: Gift },
        { title: "Payroll & Expenses", url: "/payroll", icon: Calculator },
        // { title: "Partnerships", url: "/location-partnerships", icon: Users },
      ]
    : [
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Automatic Logs", url: "/automatic-logs", icon: Database },
        { title: "Manual Logs", url: "/manual-logs", icon: PenTool },
        { title: "Pay Later", url: "/pay-later", icon: CreditCard },
        { title: "Comparison", url: "/comparison", icon: FileText },
        { title: "Reports & Statistics", url: "/reports", icon: BarChart3 },
        { title: "Payment Details", url: "/payment-details", icon: CreditCard },
        { title: "Manager Access", url: "/manager-access", icon: Users },
        // { title: "Partnerships", url: "/location-partnerships", icon: Users },
        { title: "Price Settings", url: "/price-settings", icon: Settings },
        { title: "Vehicle History", url: "/vehicle-history", icon: Search },
        { title: "Owner Manual Entry", url: "/owner-entry", icon: Car },
        { title: "Loyalty", url: "/loyalty", icon: Gift },
        { title: "Payroll & Expenses", url: "/payroll", icon: Calculator },
      ];

  return (
    <Sidebar className="border-r">
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
            <div className="flex items-center gap-2">
              {/* Show location-specific logo if uploaded, otherwise show default logo */}
              <img 
                src={locationLogo || "/uploads/Logo only white bg.png"} 
                alt="Location Logo" 
                className="h-6 w-6 sm:h-10 sm:w-10 object-contain"
                onError={(e) => {
                  // Fallback to default logo if custom location logo fails to load
                  e.currentTarget.src = "/uploads/Logo only white bg.png";
                }}
              />
              <span className="font-bold text-lg sm:text-2xl">PetaLog</span>
            </div>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${getNavClassName(item.url)}`}
                      onClick={handleNavigationClick}
                    >
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}