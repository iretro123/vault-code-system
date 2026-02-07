import { Navigate } from "react-router-dom";

// Index page redirects to the primary cockpit view
const Dashboard = () => {
  return <Navigate to="/cockpit" replace />;
};

export default Dashboard;
