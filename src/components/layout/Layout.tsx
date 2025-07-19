import React from "react";
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import Dashboard from '@/pages/Dashboard';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [selectedLocation, setSelectedLocation] = useState("1");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <Header 
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
          />
          
          <main className="flex-1 overflow-auto">
            {React.isValidElement(children) && children.type === Dashboard
              ? React.cloneElement(children, { selectedLocation })
              : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}