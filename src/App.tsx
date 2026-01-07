import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import DashboardPage from './pages/Dashboard';
import TripsPage from './pages/trips';
import TripDetailPage from './pages/trips/[id]';
import NewTripPage from './pages/trips/new';
import GenerateTripPage from './pages/trips/generate';
import TripBudgetPage from './pages/trips/budget';
import TripSchedulePage from './pages/trips/schedule';
import TripOptimizePage from './pages/trips/optimize';
import TripDecisionPage from './pages/trips/decision';
import TripWhatIfPage from './pages/trips/what-if';
import TripReviewPage from './pages/trips/review';
import CollectedTripsPage from './pages/trips/collected';
import SharedTripPage from './pages/trips/shared/[shareToken]';
import FeaturedTripsPage from './pages/trips/featured';
import PlacesPage from './pages/places';
import PlaceDetailPage from './pages/places/[id]';
import HotelsRecommendPage from './pages/places/hotels';
import TrailsPage from './pages/trails';
import TrailsExplorePage from './pages/trails/explore';
import TrailDetailPage from './pages/trails/[id]';
import PrepCenterPage from './pages/trails/prep/[hikePlanId]';
import OnTrailLivePage from './pages/trails/on-trail/[hikePlanId]';
import HikeReviewPage from './pages/trails/review/[hikePlanId]';
// PreferencesPage has been moved to Settings page, old route redirects to /dashboard/settings?tab=preferences
import CountriesPage from './pages/countries';
import CountryDetailPage from './pages/countries/[countryCode]';
import CountryTemplatesPage from './pages/countries/templates';
import RouteDirectionsByCountryPage from './pages/route-directions/by-country';
import RouteTemplatesPage from './pages/route-directions/templates';
import RouteTemplateDetailPage from './pages/route-directions/templates/[id]';
import PlanStudioPage from './pages/plan-studio';
import ExecutePage from './pages/execute';
import ReadinessPage from './pages/readiness';
import InsightsPage from './pages/insights';
import SettingsPage from './pages/settings';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // accessToken 存储在 sessionStorage
  const accessToken = sessionStorage.getItem('accessToken');
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

// Legacy DashboardLayout has been replaced by the new DashboardLayout component

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

        {/* UI Test Page */}
        <Route path="/ui-test" element={<UiTestPage />} />

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
          <Route path="trips/:id" element={<TripDetailPage />} />
          <Route path="trips/:id/budget" element={<TripBudgetPage />} />
          <Route path="trips/:id/schedule" element={<TripSchedulePage />} />
          <Route path="trips/:id/review" element={<TripReviewPage />} />
          <Route path="trips/optimize" element={<TripOptimizePage />} />
          <Route path="trips/decision" element={<TripDecisionPage />} />
          <Route path="trips/what-if" element={<TripWhatIfPage />} />
          <Route path="plan-studio" element={<PlanStudioPage />} />
          <Route path="execute" element={<ExecutePage />} />
          <Route path="readiness" element={<ReadinessPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="places" element={<PlacesPage />} />
          <Route path="places/:id" element={<PlaceDetailPage />} />
          <Route path="hotels" element={<HotelsRecommendPage />} />
          <Route path="trails" element={<TrailsPage />} />
          <Route path="trails/explore" element={<TrailsExplorePage />} />
          <Route path="trails/:id" element={<TrailDetailPage />} />
          <Route path="trails/prep/:hikePlanId" element={<PrepCenterPage />} />
          <Route path="trails/on-trail/:hikePlanId" element={<OnTrailLivePage />} />
          <Route path="trails/review/:hikePlanId" element={<HikeReviewPage />} />
          <Route path="preferences" element={<Navigate to="/dashboard/settings?tab=preferences" replace />} />
          <Route path="countries" element={<CountriesPage />} />
          <Route path="countries/templates" element={<CountryTemplatesPage />} />
          <Route path="countries/:countryCode" element={<CountryDetailPage />} />
          <Route path="route-directions/by-country" element={<RouteDirectionsByCountryPage />} />
          <Route path="route-directions/templates" element={<RouteTemplatesPage />} />
          <Route path="route-directions/templates/:id" element={<RouteTemplateDetailPage />} />
        </Route>

        {/* Legacy routes redirect to dashboard */}
        <Route path="/trips" element={<Navigate to="/dashboard/trips" replace />} />
        <Route path="/places" element={<Navigate to="/dashboard/places" replace />} />
        <Route path="/hotels" element={<Navigate to="/dashboard/hotels" replace />} />
        <Route path="/trails" element={<Navigate to="/dashboard/trails" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

