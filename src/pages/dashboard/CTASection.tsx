import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-1">
              把梦想变成可执行路线 →
            </h3>
            <p className="text-indigo-100 text-sm">
              开始规划你的下一次完美旅程
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/dashboard/trips/new')}
            className="bg-white text-indigo-600 hover:bg-gray-100"
          >
            开始规划 <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
