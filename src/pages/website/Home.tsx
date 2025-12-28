import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import HeroSection from './sections/HeroSection';
import ProblemSection from './sections/ProblemSection';
import RouteDirectionSection from './sections/RouteDirectionSection';
import DEMEngineSection from './sections/DEMEngineSection';
import ThreePersonasSection from './sections/ThreePersonasSection';
import ProductTiersSection from './sections/ProductTiersSection';
import WhoUsesSection from './sections/WhoUsesSection';
import ClosingSection from './sections/ClosingSection';
import GoogleOneTap from '@/components/auth/GoogleOneTap';

export default function HomePage() {
  const navigate = useNavigate();
  const { loginWithGoogle, isAuthenticated, loading } = useAuth();

  const handleOneTapSuccess = async (authResponse: any) => {
    try {
      // loginWithGoogle 会处理完整的 AuthResponse
      await loginWithGoogle(authResponse);
      // 可以显示一个提示，然后导航到 dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('One Tap login failed:', error);
    }
  };

  // 只在未登录时显示 One Tap，并且等待 auth 加载完成
  return (
    <div>
      {!loading && !isAuthenticated && (
        <GoogleOneTap
          onSuccess={handleOneTapSuccess}
          autoSelect={true}
        />
      )}
      <HeroSection />
      <ProblemSection />
      <RouteDirectionSection />
      <DEMEngineSection />
      <ThreePersonasSection />
      <ProductTiersSection />
      <WhoUsesSection />
      <ClosingSection />
    </div>
  );
}

