import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import WebsiteLayout from './components/layout/WebsiteLayout';
import Layout from './components/layout/Layout';
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
import TripsPage from './pages/trips';
import PlacesPage from './pages/places';
import HotelsPage from './pages/hotels';
import TrailsPage from './pages/trails';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // accessToken 存储在 sessionStorage
  const accessToken = sessionStorage.getItem('accessToken');
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

// Dashboard wrapper for authenticated routes
function DashboardLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
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
          <Route path="contact" element={<ContactPage />} />
        </Route>

        {/* Login Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Register Page */}
        <Route path="/register" element={<RegisterPage />} />

        {/* UI Test Page */}
        <Route path="/ui-test" element={<UiTestPage />} />

        {/* Dashboard Routes (Protected) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard/trips" replace />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="places" element={<PlacesPage />} />
          <Route path="hotels" element={<HotelsPage />} />
          <Route path="trails" element={<TrailsPage />} />
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

