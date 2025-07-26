import React, { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import Dashboard from '@/pages/Dashboard';
import AutomaticLogs from '@/pages/AutomaticLogs';
import ManualLogs from '@/pages/ManualLogs';
import { supabase } from "@/lib/supabaseClient";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("locations").select("id, name, address");
      if (data && data.length > 0) {
        setLocations(data);
        setSelectedLocation(data[0].id);
      }
    };
    fetchLocations();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header 
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
          />
          <main className="flex-1 overflow-auto">
            {React.isValidElement(children) && (children.type === Dashboard || children.type === AutomaticLogs || children.type === ManualLogs)
              ? React.cloneElement(children as React.ReactElement<any>, { selectedLocation })
              : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}