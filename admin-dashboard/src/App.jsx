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
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/users" element={<Users />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/support" element={<Support />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/team" element={<Team />} />
          <Route path="/banners" element={<Banners />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/contact-info" element={<ContactInfo />} />
          <Route path="/payments" element={<Payments />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
