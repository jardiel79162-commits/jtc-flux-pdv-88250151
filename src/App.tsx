import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import OfflineDetector from "./components/OfflineDetector";
import TermsAcceptanceModal from "./components/TermsAcceptanceModal";
import Auth from "./pages/Auth";
import ConfirmEmail from "./pages/ConfirmEmail";
import Dashboard from "./pages/Dashboard";
import Auri from "./pages/Auri";
import Subscription from "./pages/Subscription";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import POS from "./pages/POS";
import POSProductSelect from "./pages/POSProductSelect";
import POSCustomerSelect from "./pages/POSCustomerSelect";
import Customers from "./pages/Customers";
import CustomerForm from "./pages/CustomerForm";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SalesHistory from "./pages/SalesHistory";
import Suppliers from "./pages/Suppliers";
import SupplierForm from "./pages/SupplierForm";
import WeeklyRedemption from "./pages/WeeklyRedemption";
import Calculator from "./pages/Calculator";
import Manuals from "./pages/Manuals";
import PrizeWheel from "./pages/PrizeWheel";

import DashboardLayout from "./components/DashboardLayout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEmpresas from "./pages/admin/AdminEmpresas";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminMaintenance from "./pages/admin/AdminMaintenance";
import AdminLegalDocs from "./pages/admin/AdminLegalDocs";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminShortcuts from "./pages/admin/AdminShortcuts";
import AdminSpins from "./pages/admin/AdminSpins";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import About from "./pages/About";
import Inbox from "./pages/Inbox";

const queryClient = new QueryClient();

const App = () => {
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <TooltipProvider>
        <OfflineDetector />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* Modal de aceitação de termos - aparece sobre tudo */}
          <TermsAcceptanceModal onAccepted={() => setTermsAccepted(true)} />

          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/confirmar-email" element={<ConfirmEmail />} />
            <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos-de-uso" element={<TermsOfUse />} />
            <Route path="/sobre" element={<About />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="empresas" element={<AdminEmpresas />} />
              <Route path="pagamentos" element={<AdminPayments />} />
              <Route path="assinaturas" element={<AdminSubscriptions />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="manutencao" element={<AdminMaintenance />} />
              <Route path="mensagens" element={<AdminMessages />} />
              <Route path="indicacoes" element={<AdminReferrals />} />
              <Route path="atalhos" element={<AdminShortcuts />} />
              <Route path="roleta" element={<AdminSpins />} />
              <Route path="termos" element={<AdminLegalDocs />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assinatura" element={<Subscription />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/produtos/novo" element={<ProductForm />} />
              <Route path="/produtos/editar/:id" element={<ProductForm />} />
              <Route path="/pdv" element={<POS />} />
              <Route path="/pdv/produtos" element={<POSProductSelect />} />
              <Route path="/pdv/clientes" element={<POSCustomerSelect />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/clientes/novo" element={<CustomerForm />} />
              <Route path="/clientes/editar/:id" element={<CustomerForm />} />
              <Route path="/historico" element={<SalesHistory />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/fornecedores" element={<Suppliers />} />
              <Route path="/fornecedores/novo" element={<SupplierForm />} />
              <Route path="/fornecedores/editar/:id" element={<SupplierForm />} />
              <Route path="/resgate-semanal" element={<WeeklyRedemption />} />
              <Route path="/calculadora" element={<Calculator />} />
              <Route path="/auri" element={<Auri />} />
              <Route path="/manuais" element={<Manuals />} />
              <Route path="/roleta" element={<PrizeWheel />} />
              <Route path="/caixa-de-mensagem" element={<Inbox />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
