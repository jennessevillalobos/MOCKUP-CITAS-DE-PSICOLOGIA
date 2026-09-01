import { Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import ServicesPage from '@/pages/ServicesPage';
import ServiceDetailPage from '@/pages/ServiceDetailPage';
import ProfessionalsPage from '@/pages/ProfessionalsPage';
import CoursesPage from '@/pages/CoursesPage';
import StorePage from '@/pages/StorePage';
import DigitalProductDetailPage from '@/pages/DigitalProductDetailPage';
import ResourcesPage from '@/pages/ResourcesPage';
import ContactPage from '@/pages/ContactPage';
import AuthPage from '@/pages/AuthPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LegalPage from '@/pages/LegalPage';
import AboutPage from '@/pages/AboutPage';
import ProfessionalProfilePage from '@/pages/ProfessionalProfilePage';
import CourseDetailPage from '@/pages/CourseDetailPage';
import RecoverPasswordPage from '@/pages/RecoverPasswordPage';
import PatientPortalPage from '@/pages/PatientPortalPage';
import PatientProfilePage from '@/pages/PatientProfilePage';
import AulaVirtualPage from '@/pages/AulaVirtualPage';
import LessonPlayerPage from '@/pages/LessonPlayerPage';
import AssessmentPage from '@/pages/AssessmentPage';
import GradesPage from '@/pages/GradesPage';
import ProgressPage from '@/pages/ProgressPage';
import InstallmentsPage from '@/pages/InstallmentsPage';
import LibraryPage from '@/pages/LibraryPage';
import LiveClassesPage from '@/pages/LiveClassesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import InstructorPage from '@/pages/InstructorPage';
import ConstructorCursosPage from '@/pages/ConstructorCursosPage';
import MisCitasPage from '@/pages/MisCitasPage';
import MisCursosPage from '@/pages/MisCursosPage';
import ClasesVivoPage from '@/pages/ClasesVivoPage';
import EvaluacionesPage from '@/pages/EvaluacionesPage';
import InstructorNotificationsPage from '@/pages/InstructorNotificationsPage';
import AgendaDisponibilidadPage from '@/pages/AgendaDisponibilidadPage';
import InstructorProfilePage from '@/pages/InstructorProfilePage';
import AgendarCitaPage from '@/pages/AgendarCitaPage';
import { InstructorAgendaProvider } from '@/context/InstructorAgendaContext';
import { InstructorCoursesProvider } from '@/context/InstructorCoursesContext';
import { InstructorLiveClassesProvider } from '@/context/InstructorLiveClassesContext';
import { InstructorGradingProvider } from '@/context/InstructorGradingContext';
import { InstructorNotificationsProvider } from '@/context/InstructorNotificationsContext';
import { InstructorScheduleProvider } from '@/context/InstructorScheduleContext';
import ProtectedSiteRoute from '@/components/site/ProtectedSiteRoute';
import { SiteAuthProvider } from '@/context/SiteAuthContext';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminServicesPage from '@/pages/admin/AdminServicesPage';
import AdminAgendaPage from '@/pages/admin/AdminAgendaPage';
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage';
import AdminFinancePage from '@/pages/admin/AdminFinancePage';
import AdminDigitalProductsPage from '@/pages/admin/AdminDigitalProductsPage';
import AdminCoursesPage from '@/pages/admin/AdminCoursesPage';
import AdminLiveClassesPage from '@/pages/admin/AdminLiveClassesPage';
import AdminNotificationsPage from '@/pages/admin/AdminNotificationsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminAssessmentsPage from '@/pages/admin/AdminAssessmentsPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminReviewsPage from '@/pages/admin/AdminReviewsPage';
import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { AdminLanguageProvider } from '@/context/AdminLanguageContext';
import { SiteLanguageProvider } from '@/context/SiteLanguageContext';

function App() {
  return (
    <SiteLanguageProvider>
    <SiteAuthProvider>
    <AdminLanguageProvider>
    <AdminAuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
         <Route path="/servicios" element={<ServicesPage />} />
         <Route path="/servicios/:key" element={<ServiceDetailPage />} />
        <Route path="/profesionales" element={<ProfessionalsPage />} />
        <Route path="/cursos" element={<CoursesPage />} />
         <Route path="/tienda" element={<StorePage />} />
         <Route path="/tienda/:id" element={<DigitalProductDetailPage />} />
        <Route path="/recursos" element={<ResourcesPage />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/iniciar-sesion" element={<AuthPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/quienes-somos" element={<AboutPage />} />
        <Route path="/profesionales/:slug" element={<ProfessionalProfilePage />} />
        <Route path="/cursos/:slug" element={<CourseDetailPage />} />
        <Route path="/recuperar-password" element={<RecoverPasswordPage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route
          path="/agendar"
          element={
            <InstructorAgendaProvider>
              <AgendarCitaPage />
            </InstructorAgendaProvider>
          }
        />
        <Route
          path="/portal-paciente"
          element={
            <ProtectedSiteRoute rol="paciente">
              <InstructorAgendaProvider>
                <PatientPortalPage />
              </InstructorAgendaProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/portal-paciente/perfil"
          element={
            <ProtectedSiteRoute rol="paciente">
              <PatientProfilePage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual"
          element={
            <ProtectedSiteRoute rol="paciente">
              <AulaVirtualPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/clase"
          element={
            <ProtectedSiteRoute rol="paciente">
              <LessonPlayerPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/evaluacion"
          element={
            <ProtectedSiteRoute rol="paciente">
              <AssessmentPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/calificaciones"
          element={
            <ProtectedSiteRoute rol="paciente">
              <GradesPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/progreso"
          element={
            <ProtectedSiteRoute rol="paciente">
              <ProgressPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/pagos"
          element={
            <ProtectedSiteRoute rol="paciente">
              <InstallmentsPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/biblioteca"
          element={
            <ProtectedSiteRoute rol="paciente">
              <LibraryPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/vivo"
          element={
            <ProtectedSiteRoute rol="paciente">
              <LiveClassesPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/aula-virtual/notificaciones"
          element={
            <ProtectedSiteRoute rol="paciente">
              <NotificationsPage />
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorAgendaProvider>
                <InstructorCoursesProvider>
                  <InstructorLiveClassesProvider>
                    <InstructorGradingProvider>
                      <InstructorPage />
                    </InstructorGradingProvider>
                  </InstructorLiveClassesProvider>
                </InstructorCoursesProvider>
              </InstructorAgendaProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/citas"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorAgendaProvider>
                <MisCitasPage />
              </InstructorAgendaProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/cursos"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorCoursesProvider>
                <MisCursosPage />
              </InstructorCoursesProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/constructor"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorCoursesProvider>
                <ConstructorCursosPage />
              </InstructorCoursesProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/constructor/:cursoKey"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorCoursesProvider>
                <ConstructorCursosPage />
              </InstructorCoursesProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/vivo"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorLiveClassesProvider>
                <ClasesVivoPage />
              </InstructorLiveClassesProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/evaluaciones"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorCoursesProvider>
                <InstructorGradingProvider>
                  <EvaluacionesPage />
                </InstructorGradingProvider>
              </InstructorCoursesProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/notificaciones"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorNotificationsProvider>
                <InstructorNotificationsPage />
              </InstructorNotificationsProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/agenda"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorAgendaProvider>
                <InstructorScheduleProvider>
                  <AgendaDisponibilidadPage />
                </InstructorScheduleProvider>
              </InstructorAgendaProvider>
            </ProtectedSiteRoute>
          }
        />
        <Route
          path="/instructor/perfil"
          element={
            <ProtectedSiteRoute rol="profesional">
              <InstructorProfilePage />
            </ProtectedSiteRoute>
          }
        />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedAdminRoute>
              <AdminUsersPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/servicios"
          element={
            <ProtectedAdminRoute>
              <AdminServicesPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/agenda"
          element={
            <ProtectedAdminRoute>
              <AdminAgendaPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/pagos"
          element={
            <ProtectedAdminRoute>
              <AdminPaymentsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/finanzas"
          element={
            <ProtectedAdminRoute>
              <AdminFinancePage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/productos-digitales"
          element={
            <ProtectedAdminRoute>
              <AdminDigitalProductsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/cursos"
          element={
            <ProtectedAdminRoute>
              <AdminCoursesPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/clases-en-vivo"
          element={
            <ProtectedAdminRoute>
              <AdminLiveClassesPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/notificaciones"
          element={
            <ProtectedAdminRoute>
              <AdminNotificationsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/configuracion"
          element={
            <ProtectedAdminRoute>
              <AdminSettingsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/evaluaciones"
          element={
            <ProtectedAdminRoute>
              <AdminAssessmentsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/reportes"
          element={
            <ProtectedAdminRoute>
              <AdminReportsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/reseñas"
          element={
            <ProtectedAdminRoute>
              <AdminReviewsPage />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
    </AdminAuthProvider>
    </AdminLanguageProvider>
    </SiteAuthProvider>
    </SiteLanguageProvider>
  );
}

export default App;
