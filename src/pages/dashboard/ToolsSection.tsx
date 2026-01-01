import { useNavigate } from 'react-router-dom';
import type { TripDetail, TripListItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileDown, 
  Users, 
  FileText, 
  Calculator, 
  ListChecks,
  Share2
} from 'lucide-react';

interface ToolsSectionProps {
  activeTrip: TripDetail | null;
  trips: TripListItem[];
}

export default function ToolsSection({ activeTrip }: ToolsSectionProps) {
  const navigate = useNavigate();

  const tools = [
    {
      id: 'export-pdf',
      name: '导出 PDF',
      icon: <FileDown className="w-5 h-5" />,
      onClick: () => {
        if (activeTrip) {
          // TODO: 实现 PDF 导出
          console.log('Export PDF for trip:', activeTrip.id);
        }
      },
    },
    {
      id: 'invite',
      name: '邀请同行',
      icon: <Users className="w-5 h-5" />,
      onClick: () => {
        if (activeTrip) {
          navigate(`/dashboard/trips/${activeTrip.id}`);
        }
      },
    },
    {
      id: 'notes',
      name: '添加备注',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => {
        if (activeTrip) {
          navigate(`/dashboard/trips/${activeTrip.id}`);
        }
      },
    },
    {
      id: 'budget',
      name: '查看预算估算',
      icon: <Calculator className="w-5 h-5" />,
      onClick: () => {
        if (activeTrip) {
          navigate(`/dashboard/trips/${activeTrip.id}/budget`);
        }
      },
    },
    {
      id: 'checklist',
      name: '查看必备清单',
      icon: <ListChecks className="w-5 h-5" />,
      onClick: () => {
        if (activeTrip) {
          navigate(`/dashboard/trips/${activeTrip.id}`);
        }
      },
    },
    {
      id: 'share',
      name: '分享行程',
      icon: <Share2 className="w-5 h-5" />,
      onClick: () => {
        if (activeTrip) {
          navigate(`/dashboard/trips/${activeTrip.id}`);
        }
      },
    },
  ];

  if (!activeTrip) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>旅程工具区</CardTitle>
        <CardDescription>
          常用的旅程管理工具
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={tool.onClick}
            >
              {tool.icon}
              <span className="text-sm">{tool.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
