import { Navigate } from "react-router-dom";

export default function Loyalty() {
  // Redirect to the dashboard when accessing /loyalty directly
  return <Navigate to="/loyalty/dashboard" replace />;
}
