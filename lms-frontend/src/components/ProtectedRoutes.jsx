import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRole, children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !role) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/login" replace />;

  return children;
}
