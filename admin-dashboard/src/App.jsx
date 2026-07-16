import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Coupons from './pages/Coupons';
import Support from './pages/Support';
import Reviews from './pages/Reviews';
import Returns from './pages/Returns';
import FAQ from './pages/FAQ';
import Policies from './pages/Policies';
import Team from './pages/Team';
import Banners from './pages/Banners';
import Categories from './pages/Categories';
import ContactInfo from './pages/ContactInfo';
import Payments from './pages/Payments';

function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/coupons" element={<Coupons />} />
          <Route path="/admin/support" element={<Support />} />
          <Route path="/admin/reviews" element={<Reviews />} />
          <Route path="/admin/returns" element={<Returns />} />
          <Route path="/admin/faq" element={<FAQ />} />
          <Route path="/admin/policies" element={<Policies />} />
          <Route path="/admin/team" element={<Team />} />
          <Route path="/admin/banners" element={<Banners />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/contact-info" element={<ContactInfo />} />
          <Route path="/admin/payments" element={<Payments />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;
