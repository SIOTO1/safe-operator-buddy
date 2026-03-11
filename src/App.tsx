import { Suspense, lazy } from "react";
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
import DashboardRedirect from "./pages/DashboardRedirect";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (code-split by route)
const ChatPage = lazy(() => import("./pages/ChatPage"));
const KnowledgePage = lazy(() => import("./pages/KnowledgePage"));
const ChecklistsPage = lazy(() => import("./pages/ChecklistsPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const CrewPage = lazy(() => import("./pages/CrewPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const IncidentReportPage = lazy(() => import("./pages/IncidentReportPage"));
const WaiverPage = lazy(() => import("./pages/WaiverPage"));
const SOPsPage = lazy(() => import("./pages/SOPsPage"));
const InterviewGuidePage = lazy(() => import("./pages/InterviewGuidePage"));
const DriverManagementPage = lazy(() => import("./pages/DriverManagementPage"));
const DifficultConversationsPage = lazy(() => import("./pages/DifficultConversationsPage"));
const SchedulingPage = lazy(() => import("./pages/SchedulingPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const EventCalendarPage = lazy(() => import("./pages/EventCalendarPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const BookingManagementPage = lazy(() => import("./pages/BookingManagementPage"));
const EquipmentCatalogPage = lazy(() => import("./pages/EquipmentCatalogPage"));
const ProductCatalogPage = lazy(() => import("./pages/ProductCatalogPage"));
const DeliverySchedulePage = lazy(() => import("./pages/DeliverySchedulePage"));
const RoutePlanningPage = lazy(() => import("./pages/RoutePlanningPage"));
const LeadsPage = lazy(() => import("./pages/crm/LeadsPage"));
const LeadDetailPage = lazy(() => import("./pages/crm/LeadDetailPage"));
const PipelinePage = lazy(() => import("./pages/crm/PipelinePage"));
const TasksPage = lazy(() => import("./pages/crm/TasksPage"));
const CrmDashboardPage = lazy(() => import("./pages/crm/CrmDashboardPage"));
const QuotesPage = lazy(() => import("./pages/crm/QuotesPage"));
const QuoteBuilderPage = lazy(() => import("./pages/crm/QuoteBuilderPage"));
const QuoteDetailPage = lazy(() => import("./pages/crm/QuoteDetailPage"));
const ContractSigningPage = lazy(() => import("./pages/crm/ContractSigningPage"));
const CustomerPortalPage = lazy(() => import("./pages/CustomerPortalPage"));
const SetupWizardPage = lazy(() => import("./pages/SetupWizardPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const StorefrontPage = lazy(() => import("./pages/StorefrontPage"));
const ComplianceDashboardPage = lazy(() => import("./pages/ComplianceDashboardPage"));
const BookingSuccessPage = lazy(() => import("./pages/BookingSuccessPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // Data stays fresh for 2 minutes
      gcTime: 10 * 60 * 1000,          // Cache kept for 10 minutes
      refetchOnWindowFocus: true,       // Background refresh on tab focus
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <OrgSettingsProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/portal/event/:token" element={<CustomerPortalPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/rentals/:slug" element={<StorefrontPage />} />
            <Route path="/rentals/:slug/booking-success" element={<BookingSuccessPage />} />

            {/* Legacy /dashboard redirect → resolves slug and redirects */}
            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            } />

            {/* Setup wizard */}
            <Route path="/app/:slug/setup" element={
              <ProtectedRoute>
                <SetupWizardPage />
              </ProtectedRoute>
            } />

            {/* Slug-based company routes */}
            <Route path="/app/:slug" element={
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
              <Route path="events/calendar" element={<EventCalendarPage />} />
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
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="compliance" element={<ComplianceDashboardPage />} />
              <Route path="settings" element={<ProtectedRoute requiredRole="owner"><SettingsPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        </OrgSettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
