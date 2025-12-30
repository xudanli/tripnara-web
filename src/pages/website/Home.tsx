import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import HeroSection from './sections/HeroSection';
import HeroFeaturesSection from './sections/HeroFeaturesSection';
import DecisionComparisonSection from './sections/DecisionComparisonSection';
import ThreePersonasSection from './sections/ThreePersonasSection';
import DEMTopographySection from './sections/DEMTopographySection';
import UserStoriesSection from './sections/UserStoriesSection';
import ProfessionalUsersSection from './sections/ProfessionalUsersSection';
import FAQSection from './sections/FAQSection';
import FinalCTASection from './sections/FinalCTASection';
import GoogleOneTap from '@/components/auth/GoogleOneTap';

export default function HomePage() {
  const navigate = useNavigate();
  const { loginWithGoogle, isAuthenticated, loading } = useAuth();

  const handleOneTapSuccess = async (authResponse: any) => {
    try {
      await loginWithGoogle(authResponse);
      navigate('/dashboard');
    } catch (error) {
      console.error('One Tap login failed:', error);
    }
  };

  return (
    <div>
      {!loading && !isAuthenticated && (
        <GoogleOneTap
          onSuccess={handleOneTapSuccess}
          autoSelect={true}
        />
      )}
      <HeroSection />
      <HeroFeaturesSection />
      <DecisionComparisonSection />
      <ThreePersonasSection />
      <DEMTopographySection />
      <UserStoriesSection />
      <ProfessionalUsersSection />
      <FAQSection />
      <FinalCTASection />
    </div>
  );
}
