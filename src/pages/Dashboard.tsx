/**
 * Dashboard 页面 - 默认显示自然语言创建行程界面
 * 符合 TripNARA "对话优先"的产品定位
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import { useOnboarding } from '@/hooks/useOnboarding';
import NLChatInterface from '@/components/trips/NLChatInterface';
import { useFitnessPrompt } from '@/hooks/useFitnessPrompt';
import { FitnessPromptCard, FitnessQuestionnaireDialog } from '@/components/fitness';

export default function DashboardPage() {
  const navigate = useNavigate();
  
  // Onboarding
  const {
    isFirstTime,
    completeWelcome,
    dismiss,
  } = useOnboarding();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 体能评估提示
  const { shouldShow, tryShowPrompt, onComplete, onDismiss, hasProfile, isLoading: fitnessLoading } = useFitnessPrompt();
  const [showFitnessQuestionnaire, setShowFitnessQuestionnaire] = useState(false);

  useEffect(() => {
    // 🆕 强制清除旧的会话，确保显示新的欢迎界面
    localStorage.removeItem('nl_conversation_session');
    
    // 短暂延迟，确保页面渲染完成
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 检查是否需要显示 Welcome Modal（首次登录时）
  useEffect(() => {
    if (loading) return;
    
    // 首次登录时显示 Welcome Modal
    if (isFirstTime) {
      setShowWelcomeModal(true);
    }
  }, [isFirstTime, loading]);

  // 检查是否需要显示体能评估提示（在 Welcome Modal 完成后或非首次登录时）
  useEffect(() => {
    if (loading || showWelcomeModal || fitnessLoading) return;
    
    // 如果还没有体能画像，尝试显示提示
    if (!hasProfile) {
      const timer = setTimeout(() => {
        tryShowPrompt('login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, showWelcomeModal, fitnessLoading, hasProfile, tryShowPrompt]);

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    completeWelcome(experienceType);
    setShowWelcomeModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Welcome Modal */}
      <WelcomeModal
        open={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false);
          dismiss();
        }}
        onComplete={handleWelcomeComplete}
      />

      {/* 体能评估提示横幅 - 在聊天界面顶部显示 */}
      {shouldShow && (
        <div className="px-4 pt-2">
          <FitnessPromptCard
            variant="banner"
            onStartAssessment={() => {
              setShowFitnessQuestionnaire(true);
            }}
            onDismiss={onDismiss}
          />
        </div>
      )}

      {/* 体能评估问卷弹窗 */}
      <FitnessQuestionnaireDialog
        open={showFitnessQuestionnaire}
        onOpenChange={setShowFitnessQuestionnaire}
        onComplete={() => {
          onComplete();
          setShowFitnessQuestionnaire(false);
        }}
        trigger="dashboard_prompt"
      />

      {/* 🆕 默认显示自然语言创建行程界面 */}
      <div className="flex-1 h-full overflow-hidden">
        <NLChatInterface 
          onTripCreated={(tripId) => {
            console.log('[DashboardPage] 行程创建成功:', tripId);
            navigate(`/dashboard/plan-studio?tripId=${tripId}`);
          }}
          showHeader={false}
          resetOnMount={true} // 🆕 强制重置会话，确保显示新的欢迎界面
        />
      </div>
    </div>
  );
}
