import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import WebsiteLayout from './components/layout/WebsiteLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import HomePage from './pages/website/Home';
import ProductPage from './pages/website/Product';
import RouteIntelligencePage from './pages/website/RouteIntelligence';
import ProfessionalsPage from './pages/website/Professionals';
import PricingPage from './pages/website/Pricing';
import StoriesPage from './pages/website/Stories';
import AboutPage from './pages/website/About';
import ContactPage from './pages/website/Contact';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import UiTestPage from './pages/UiTest';
import UiTestExperienceDesignPage from './pages/UiTestExperienceDesign';
import DashboardPage from './pages/Dashboard';
import TripsPage from './pages/trips';
import TripDetailPage from './pages/trips/[id]';
import ActiveTripPage from './pages/trips/active';
import ActiveTripReplayPage from './pages/trips/replay';
import ActiveTripBackflowPage from './pages/trips/backflow';
import NewTripPage from './pages/trips/new';
import GenerateTripPage from './pages/trips/generate';
import TripBudgetPage from './pages/trips/budget';
import TripSchedulePage from './pages/trips/schedule';
import TripOptimizePage from './pages/trips/optimize';
import TripDecisionPage from './pages/trips/decision';
import TripWhatIfPage from './pages/trips/what-if';
import TripReviewPage from './pages/trips/review';
import DylCanvasPage from './pages/trips/tools/DylCanvasPage';
import CollectedTripsPage from './pages/trips/collected';
import SharedTripPage from './pages/trips/shared/[shareToken]';
const SharedTrailPage = lazy(() => import('./pages/trails/shared/[shareToken]'));
import JoinTeamPage from './pages/join-team/[token]';
import FeaturedTripsPage from './pages/trips/featured';
import PlacesPage from './pages/places';
import PlaceDetailPage from './pages/places/[id]';
import HotelsRecommendPage from './pages/places/hotels';
// PreferencesPage has been moved to Settings page, old route redirects to /dashboard/settings?tab=preferences
import RouteDirectionsByCountryPage from './pages/route-directions/by-country';
import RouteTemplatesPage from './pages/route-directions/templates';
import RouteTemplateDetailPage from './pages/route-directions/templates/[id]';
import PlanStudioPage from './pages/plan-studio';
import PlanVariantsPage from './pages/plan-studio/PlanVariantsPage';
import ExecutePage from './pages/execute';
import ReadinessPage from './pages/readiness';
import SettingsPage from './pages/settings';
import MemoryConsolePage from './features/memory/pages/MemoryConsolePage';
import { ProfilePage, OdysseyIntakePage } from './features/odyssey-intake';
import {
  MatchSquarePlazaPage,
  MyRecruitmentsPage,
  RecruitmentCreatePage,
  RecruitmentDetailPage,
  RecruitmentManagePage,
} from './features/match-square';
import AgentPage from './pages/agent';
import DecisionDraftPage from './pages/decision-draft';
import PlanningAssistantV2Page from './pages/planning-assistant-v2';
import TrailsHubPage from './pages/trails';
import TrailsExplorePage from './pages/trails/explore';
import TrailDetailPage from './pages/trails/[id]';
import TrailsSavedPage from './pages/trails/saved';
import MyHikesPage from './pages/trails/my-hikes';
import TrailsSafetyPage from './pages/trails/safety';
import TrailPrepPage from './pages/trails/prep/[hikePlanId]';
import TrailOnTrailPage from './pages/trails/on-trail/[hikePlanId]';
import TrailReviewPage from './pages/trails/review/[hikePlanId]';
import HikingLaugavegurDemoPage from './pages/demo/HikingLaugavegurDemo';
import { clearLegacyOdysseyCompanionClientStorage } from '@/lib/legacy-companion-odyssey-cleanup';

clearLegacyOdysseyCompanionClientStorage();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // accessToken 存储在 sessionStorage
  const accessToken = sessionStorage.getItem('accessToken');
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

// Legacy DashboardLayout has been replaced by the new DashboardLayout component

/** 将 /trips/:id 及子路径重定向到 /dashboard/trips/:id/... */
function RedirectTripsLegacy() {
  const { id, '*': rest } = useParams<{ id: string; '*': string }>();
  if (!id) return <Navigate to="/dashboard/trips" replace />;
  const suffix = rest ? `/${rest.replace(/^\//, '')}` : '';
  return <Navigate to={`/dashboard/trips/${id}${suffix}`} replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
        {/* Website Routes (Public) */}
        <Route path="/" element={<WebsiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="product" element={<ProductPage />} />
          <Route path="route-intelligence" element={<RouteIntelligencePage />} />
          <Route path="professionals" element={<ProfessionalsPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="stories" element={<StoriesPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="join-us" element={<ContactPage />} />
        </Route>

        {/* Login Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Register Page */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Shared Trip Page (Public) */}
        <Route path="/trips/shared/:shareToken" element={<SharedTripPage />} />
        {/* Shared hiking route (Public) */}
        <Route
          path="/trails/shared/:shareToken"
          element={
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>}>
              <SharedTrailPage />
            </Suspense>
          }
        />
        {/* Join Team by Invite (Public) */}
        <Route path="/join-team/:token" element={<JoinTeamPage />} />

        {/* UI Test Pages */}
        <Route path="/ui-test" element={<UiTestPage />} />
        <Route path="/ui-test/experience-design" element={<UiTestExperienceDesignPage />} />

        {/* 徒步融资 Demo（无登录） */}
        <Route path="/demo/hiking/laugavegur" element={<HikingLaugavegurDemoPage />} />

        {/* Dashboard Routes (Protected) - New Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trips/new" element={<NewTripPage />} />
          <Route path="trips/generate" element={<GenerateTripPage />} />
          <Route path="trips/collected" element={<CollectedTripsPage />} />
          <Route path="trips/featured" element={<FeaturedTripsPage />} />
          <Route path="trips/optimize" element={<TripOptimizePage />} />
          <Route path="trips/tools/dyl-canvas" element={<DylCanvasPage />} />
          <Route path="trips/decision" element={<TripDecisionPage />} />
          <Route path="trips/what-if" element={<TripWhatIfPage />} />
          <Route path="trips/:id/active" element={<ActiveTripPage />} />
          <Route path="trips/:id/replay" element={<ActiveTripReplayPage />} />
          <Route path="trips/:id/backflow" element={<ActiveTripBackflowPage />} />
          <Route path="trips/:id" element={<TripDetailPage />} />
          <Route path="trips/:id/budget" element={<TripBudgetPage />} />
          <Route path="trips/:id/schedule" element={<TripSchedulePage />} />
          <Route path="trips/:id/review" element={<TripReviewPage />} />
          <Route path="plan-studio" element={<PlanStudioPage />} />
          <Route path="trips/:tripId/plan-variants" element={<PlanVariantsPage />} />
          <Route path="execute" element={<ExecutePage />} />
          <Route path="readiness" element={<ReadinessPage />} />
          <Route path="agent" element={<AgentPage />} />
          <Route path="planning-assistant-v2" element={<PlanningAssistantV2Page />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tripnara/odyssey" element={<OdysseyIntakePage />} />
          <Route path="tripnara/plaza" element={<MatchSquarePlazaPage />} />
          <Route path="tripnara/plaza/my" element={<MyRecruitmentsPage />} />
          <Route path="tripnara/plaza/new" element={<RecruitmentCreatePage />} />
          <Route path="tripnara/plaza/manage/:id" element={<RecruitmentManagePage />} />
          <Route path="tripnara/plaza/:id" element={<RecruitmentDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/memory" element={<MemoryConsolePage />} />
          <Route path="decision-draft" element={<DecisionDraftPage />} />
          <Route path="places" element={<PlacesPage />} />
          <Route path="places/:id" element={<PlaceDetailPage />} />
          <Route path="hotels" element={<HotelsRecommendPage />} />
          <Route path="preferences" element={<Navigate to="/dashboard/settings?tab=preferences" replace />} />
          <Route path="route-directions/by-country" element={<RouteDirectionsByCountryPage />} />
          <Route path="route-directions/templates" element={<RouteTemplatesPage />} />
          <Route path="route-directions/templates/:id" element={<RouteTemplateDetailPage />} />
          <Route path="trails" element={<TrailsHubPage />} />
          <Route path="trails/explore" element={<TrailsExplorePage />} />
          <Route path="trails/saved" element={<TrailsSavedPage />} />
          <Route path="trails/my-hikes" element={<MyHikesPage />} />
          <Route path="trails/safety" element={<TrailsSafetyPage />} />
          <Route path="trails/prep/:hikePlanId" element={<TrailPrepPage />} />
          <Route path="trails/on-trail/:hikePlanId" element={<TrailOnTrailPage />} />
          <Route path="trails/review/:hikePlanId" element={<TrailReviewPage />} />
          <Route path="trails/:id" element={<TrailDetailPage />} />
          <Route path="decision-cockpit" element={<Navigate to="/dashboard" replace />} />
          <Route path="tripnara/explore" element={<Navigate to="/dashboard" replace />} />
          <Route path="tripnara/intake-cafe" element={<Navigate to="/dashboard" replace />} />
          <Route path="tripnara/odyssey/plaza" element={<Navigate to="/dashboard/tripnara/plaza" replace />} />
          <Route path="tripnara/odyssey/tier/:tier" element={<Navigate to="/dashboard" replace />} />
          <Route path="tripnara/booking" element={<Navigate to="/dashboard" replace />} />
          <Route path="companion" element={<Navigate to="/dashboard" replace />} />
          <Route path="companion/chat" element={<Navigate to="/dashboard" replace />} />
          <Route path="companion/persona" element={<Navigate to="/dashboard" replace />} />
          <Route path="companion/plaza" element={<Navigate to="/dashboard/tripnara/plaza" replace />} />
          <Route path="companion/onboarding" element={<Navigate to="/dashboard" replace />} />
          <Route path="companion/requests" element={<Navigate to="/dashboard" replace />} />
          <Route path="companion/recruitments" element={<Navigate to="/dashboard/tripnara/plaza" replace />} />
          <Route path="companion/recruitments/new" element={<Navigate to="/dashboard/tripnara/plaza/new" replace />} />
          <Route path="companion/clarify" element={<Navigate to="/dashboard" replace />} />
          <Route path="companion/requests/:id" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="/companion" element={<Navigate to="/dashboard" replace />} />
        <Route path="/companion/chat" element={<Navigate to="/dashboard" replace />} />
        <Route path="/companion/persona" element={<Navigate to="/dashboard" replace />} />
        <Route path="/companion/plaza" element={<Navigate to="/dashboard/tripnara/plaza" replace />} />
        <Route path="/companion/onboarding" element={<Navigate to="/dashboard" replace />} />
        <Route path="/companion/requests" element={<Navigate to="/dashboard" replace />} />
        <Route path="/companion/recruitments" element={<Navigate to="/dashboard/tripnara/plaza" replace />} />
        <Route path="/companion/recruitments/new" element={<Navigate to="/dashboard/tripnara/plaza/new" replace />} />
        <Route path="/companion/clarify" element={<Navigate to="/dashboard" replace />} />
        <Route path="/companion/requests/:id" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tripnara/explore" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tripnara/intake-cafe" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tripnara/odyssey" element={<Navigate to="/dashboard/tripnara/odyssey" replace />} />
        <Route path="/tripnara/odyssey/plaza" element={<Navigate to="/dashboard/tripnara/plaza" replace />} />
        <Route path="/tripnara/booking" element={<Navigate to="/dashboard" replace />} />

        {/* Legacy routes redirect to dashboard */}
        <Route path="/trips" element={<Navigate to="/dashboard/trips" replace />} />
        <Route path="/trips/optimize" element={<Navigate to="/dashboard/trips/optimize" replace />} />
        <Route path="/trips/:id/*" element={<RedirectTripsLegacy />} />
        <Route path="/trips/:id" element={<RedirectTripsLegacy />} />
        <Route path="/places" element={<Navigate to="/dashboard/places" replace />} />
        <Route path="/hotels" element={<Navigate to="/dashboard/hotels" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

