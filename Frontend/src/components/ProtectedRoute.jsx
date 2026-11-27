import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route protection wrapper that redirects unauthenticated users to the Login page
 * and filters authenticated users depending on allowed roles.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-navy"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    console.warn(`[ROUTE GUARD]: Role '${currentUser.role}' not permitted. Redirecting...`);
    // Redirect to correct dashboard based on actual role
    if (currentUser.role === "Admin") return <Navigate to="/admin/dashboard" replace />;
    if (currentUser.role === "Dealer") return <Navigate to="/dealer/dashboard" replace />;
    if (currentUser.role === "Beneficiary") return <Navigate to="/beneficiary/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
