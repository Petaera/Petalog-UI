import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Database,
  PenTool,
  FileText,
  BarChart3,
  Users,
  Settings,
  Search,
  Car
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

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Automatic Logs", url: "/automatic-logs", icon: Database },
  { title: "Manual Logs", url: "/manual-logs", icon: PenTool },
  { title: "Comparison", url: "/comparison", icon: FileText },
  { title: "Reports & Statistics", url: "/reports", icon: BarChart3 },
  { title: "Manager Access", url: "/manager-access", icon: Users },
  { title: "Price Settings", url: "/price-settings", icon: Settings },
  { title: "Vehicle History", url: "/vehicle-history", icon: Search },
  { title: "Owner Manual Entry", url: "/owner-entry", icon: Car },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const getNavClassName = (path: string) => {
    return isActive(path) ? "nav-item-active" : "nav-item-inactive";
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
            Car Wash Management
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
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
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