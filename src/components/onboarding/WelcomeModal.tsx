import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Brain, Wrench, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { WelcomeRouteIllustration } from '@/components/illustrations/OnboardingIllustrations';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (experienceType: 'steady' | 'balanced' | 'exploratory') => void;
}

export default function WelcomeModal({ open, onClose, onComplete }: WelcomeModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedExperience, setSelectedExperience] = useState<'steady' | 'balanced' | 'exploratory' | null>(null);

  const experiences = [
    {
      id: 'steady' as const,
      title: t('welcomeModal.experiences.steady.title'),
      description: t('welcomeModal.experiences.steady.description'),
      icon: Shield,
      color: 'red',
    },
    {
      id: 'balanced' as const,
      title: t('welcomeModal.experiences.balanced.title'),
      description: t('welcomeModal.experiences.balanced.description'),
      icon: Brain,
      color: 'orange',
    },
    {
      id: 'exploratory' as const,
      title: t('welcomeModal.experiences.exploratory.title'),
      description: t('welcomeModal.experiences.exploratory.description'),
      icon: Wrench,
      color: 'green',
    },
  ];

  const handleStartDemo = () => {
    if (selectedExperience) {
      onComplete(selectedExperience);
      // TODO: 创建 Demo Trip 并跳转
      navigate('/dashboard/trips/new?demo=true&experience=' + selectedExperience);
    }
  };

  const handleCreateOwn = () => {
    if (selectedExperience) {
      onComplete(selectedExperience);
      navigate('/dashboard/trips/new?experience=' + selectedExperience);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <WelcomeRouteIllustration size={180} />
          </div>
          <DialogTitle className="text-2xl text-center">{t('welcomeModal.title')}</DialogTitle>
          <DialogDescription className="text-base mt-2 text-center">
            {t('welcomeModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* 体验选择 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {experiences.map((exp) => {
              const Icon = exp.icon;
              const isSelected = selectedExperience === exp.id;
              return (
                <Card
                  key={exp.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    isSelected && 'border-primary border-2 bg-primary/5'
                  )}
                  onClick={() => setSelectedExperience(exp.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={cn(
                          'p-3 rounded-full',
                          exp.color === 'red' && 'bg-red-100 text-red-700',
                          exp.color === 'orange' && 'bg-orange-100 text-orange-700',
                          exp.color === 'green' && 'bg-green-100 text-green-700'
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{exp.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{exp.description}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleStartDemo}
              disabled={!selectedExperience}
              size="lg"
              className="flex-1"
            >
              {t('welcomeModal.startDemo')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={handleCreateOwn}
              disabled={!selectedExperience}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              {t('welcomeModal.createOwn')}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-2">
            {t('welcomeModal.demoHint')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

