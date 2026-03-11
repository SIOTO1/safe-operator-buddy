import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrgSettingsProvider } from "@/contexts/OrgSettingsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import SignupPage from "./pages/SignupPage";
import CompanyDashboardRedirect from "./pages/CompanyDashboardRedirect";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import ChatPage from "./pages/ChatPage";
import KnowledgePage from "./pages/KnowledgePage";
import ChecklistsPage from "./pages/ChecklistsPage";
import ContractsPage from "./pages/ContractsPage";
import CrewPage from "./pages/CrewPage";
import SettingsPage from "./pages/SettingsPage";
import IncidentReportPage from "./pages/IncidentReportPage";
import WaiverPage from "./pages/WaiverPage";
import SOPsPage from "./pages/SOPsPage";
import InterviewGuidePage from "./pages/InterviewGuidePage";
import DriverManagementPage from "./pages/DriverManagementPage";
import DifficultConversationsPage from "./pages/DifficultConversationsPage";
import SchedulingPage from "./pages/SchedulingPage";
import EventDetailPage from "./pages/EventDetailPage";
import BookingPage from "./pages/BookingPage";
import BookingManagementPage from "./pages/BookingManagementPage";
import EquipmentCatalogPage from "./pages/EquipmentCatalogPage";
import ProductCatalogPage from "./pages/ProductCatalogPage";
import DeliverySchedulePage from "./pages/DeliverySchedulePage";
import RoutePlanningPage from "./pages/RoutePlanningPage";
import LeadsPage from "./pages/crm/LeadsPage";
import LeadDetailPage from "./pages/crm/LeadDetailPage";
import PipelinePage from "./pages/crm/PipelinePage";
import TasksPage from "./pages/crm/TasksPage";
import CrmDashboardPage from "./pages/crm/CrmDashboardPage";
import QuotesPage from "./pages/crm/QuotesPage";
import QuoteBuilderPage from "./pages/crm/QuoteBuilderPage";
import QuoteDetailPage from "./pages/crm/QuoteDetailPage";
import ContractSigningPage from "./pages/crm/ContractSigningPage";
import CustomerPortalPage from "./pages/CustomerPortalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <OrgSettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/portal/event/:token" element={<CustomerPortalPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardHome />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="checklists" element={<ChecklistsPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="incident-report" element={<IncidentReportPage />} />
              <Route path="waiver" element={<WaiverPage />} />
              <Route path="sops" element={<SOPsPage />} />
              <Route path="interview-guide" element={<InterviewGuidePage />} />
              <Route path="drivers" element={<DriverManagementPage />} />
              <Route path="conversations" element={<DifficultConversationsPage />} />
              <Route path="crew" element={<CrewPage />} />
              <Route path="scheduling" element={<SchedulingPage />} />
              <Route path="scheduling/:eventId" element={<EventDetailPage />} />
              <Route path="bookings" element={<BookingManagementPage />} />
              <Route path="equipment" element={<EquipmentCatalogPage />} />
              <Route path="products" element={<ProductCatalogPage />} />
              <Route path="deliveries" element={<DeliverySchedulePage />} />
              <Route path="routes" element={<RoutePlanningPage />} />
              <Route path="crm" element={<CrmDashboardPage />} />
              <Route path="crm/leads" element={<LeadsPage />} />
              <Route path="crm/leads/:id" element={<LeadDetailPage />} />
              <Route path="crm/pipeline" element={<PipelinePage />} />
              <Route path="crm/tasks" element={<TasksPage />} />
              <Route path="crm/quotes" element={<QuotesPage />} />
              <Route path="crm/quotes/:id" element={<QuoteDetailPage />} />
              <Route path="quotes/create" element={<QuoteBuilderPage />} />
              <Route path="crm/contracts/:id" element={<ContractSigningPage />} />
              <Route path="settings" element={<ProtectedRoute requiredRole="owner"><SettingsPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </OrgSettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
