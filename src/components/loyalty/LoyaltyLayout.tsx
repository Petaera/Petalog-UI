import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LoyaltySidebar } from './LoyaltySidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Menu, 
  ArrowLeft, 
  User, 
  LogOut, 
  ChevronDown, 
  Settings, 
  Crown 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function LoyaltyLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const activeSection = location.pathname.split('/')[2] || 'dashboard';
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBackToMainApp = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Fixed Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-border/50 p-4 flex items-center justify-between z-40 md:hidden shadow-sm">
          {/* Left side - Hamburger and Back */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-2 hover:bg-primary/10 transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMainApp}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all px-3 py-2 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Main</span>
            </Button>
          </div>

          {/* Center - Loyalty Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Loyalty</span>
          </div>

          {/* Right side - Profile */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
              {user?.role === 'owner' ? 'Owner' : 'Manager'}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 p-2 hover:bg-primary/10 transition-colors">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
                    <User className="h-3 w-3" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-sm">
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                {user?.role === 'owner' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/manager-settings')} className="text-sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Manager Settings
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive text-sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="hidden md:block fixed top-4 right-4 z-30">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {user?.role === 'owner' ? 'Owner' : 'Manager'}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 bg-white/90 backdrop-blur border border-border shadow-sm hover:bg-white">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">{user?.email}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                {user?.role === 'owner' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/manager-settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Manager Settings
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <LoyaltySidebar 
        activeSection={activeSection} 
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-20' : 'md:pt-0'}`}>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
