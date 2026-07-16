import { Navigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

function ProtectedRoute() {
  const token = localStorage.getItem('adminToken');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Outlet />
    </motion.div>
  );
}

export default ProtectedRoute;
