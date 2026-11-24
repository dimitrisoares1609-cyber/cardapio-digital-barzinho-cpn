import { Link, Route, Routes } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import EmptyState from './components/EmptyState.jsx';
import { useTitle } from './lib/useTitle.js';
import { MenuProvider } from './context/MenuContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ClientLayout from './pages/client/ClientLayout.jsx';
import MenuPage from './pages/client/MenuPage.jsx';
import CartPage from './pages/client/CartPage.jsx';
import OrderTrackingPage from './pages/client/OrderTrackingPage.jsx';
import MyOrdersPage from './pages/client/MyOrdersPage.jsx';
import LoginPage from './pages/admin/LoginPage.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import OrdersPage from './pages/admin/OrdersPage.jsx';
import MenuAdminPage from './pages/admin/MenuAdminPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import TablesPage from './pages/admin/TablesPage.jsx';

function NotFound() {
  useTitle('Página não encontrada');
  return (
    <div className="page">
      <h1 className="sr-only">Página não encontrada</h1>
      <EmptyState
        icon={MapPinOff}
        title="Página não encontrada"
        action={
          <Link to="/" className="btn btn--primary">
            Ir para o cardápio
          </Link>
        }
      >
        O endereço pode estar errado ou a página foi removida.
      </EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Módulo cliente */}
      <Route
        element={
          <MenuProvider>
            <ClientLayout />
          </MenuProvider>
        }
      >
        <Route index element={<MenuPage />} />
        <Route path="carrinho" element={<CartPage />} />
        <Route path="pedido/:code" element={<OrderTrackingPage />} />
        <Route path="meus-pedidos" element={<MyOrdersPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Módulo administração */}
      <Route path="admin/login" element={<LoginPage />} />
      <Route
        path="admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OrdersPage />} />
        <Route path="cardapio" element={<MenuAdminPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="mesas" element={<TablesPage />} />
      </Route>

    </Routes>
  );
}
