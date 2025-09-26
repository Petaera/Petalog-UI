
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'manager' | 'worker' | ('owner' | 'manager' | 'worker')[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Keep loading until user is fully resolved (either authenticated or confirmed as null)
  if (loading || user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    // Handle both single role and array of roles
    const allowedRoles = Array.isArray(requiredRole) ? [...requiredRole] : [requiredRole];
    // Treat 'worker' as allowed wherever 'manager' is allowed
    if (allowedRoles.includes('manager') && !allowedRoles.includes('worker')) {
      allowedRoles.push('worker');
    }
    if (!allowedRoles.includes(user.role as 'owner' | 'manager' | 'worker')) {
      // Redirect to appropriate dashboard based on user's role
      const redirectPath = user.role === 'owner' ? '/dashboard' : '/manager-portal';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
};
