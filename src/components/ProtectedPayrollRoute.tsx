import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedPayrollRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedPayrollRoute({ children, allowedRoles }: ProtectedPayrollRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role?.toLowerCase() || '';
  
  if (!allowedRoles.includes(userRole)) {
    // Redirect managers to dashboard if they try to access restricted pages
    return <Navigate to="/payroll" replace />;
  }

  return <>{children}</>;
}
