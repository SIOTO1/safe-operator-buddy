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
              <Route path="crew" element={<CrewPage />} />
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
