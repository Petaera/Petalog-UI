import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoyaltySidebar } from './LoyaltySidebar';

export function LoyaltyLayout() {
  const location = useLocation();
  const activeSection = location.pathname.split('/')[2] || 'dashboard'; // Extract active section from the URL

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <LoyaltySidebar activeSection={activeSection} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet /> {/* Render child routes dynamically */}
        </div>
      </main>
    </div>
  );
}
