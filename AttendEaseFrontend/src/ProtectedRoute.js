import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ element }) => {
  const { user } = useAuth(); // Get the logged-in user

  return user ? element : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
