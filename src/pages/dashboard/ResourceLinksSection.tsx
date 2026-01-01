import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Hotel, Route, Navigation } from 'lucide-react';

export default function ResourceLinksSection() {
  const navigate = useNavigate();

  const resources = [
    {
      id: 'places',
      name: '地点搜索',
      description: '搜索和浏览地点',
      icon: <MapPin className="w-5 h-5" />,
      route: '/dashboard/places',
      color: 'text-blue-600',
    },
    {
      id: 'hotels',
      name: '酒店',
      description: '浏览和搜索酒店',
      icon: <Hotel className="w-5 h-5" />,
      route: '/dashboard/hotels',
      color: 'text-green-600',
    },
    {
      id: 'trails',
      name: '路线',
      description: '探索徒步路线',
      icon: <Route className="w-5 h-5" />,
      route: '/dashboard/trails',
      color: 'text-purple-600',
    },
    {
      id: 'route-directions',
      name: '路线方向',
      description: '按国家查看路线方向',
      icon: <Navigation className="w-5 h-5" />,
      route: '/dashboard/route-directions/by-country',
      color: 'text-amber-600',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>资源库</CardTitle>
        <CardDescription>
          访问地点、酒店、路线等资源
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resources.map((resource) => (
            <Button
              key={resource.id}
              variant="outline"
              className="h-auto flex-col gap-3 p-6 hover:shadow-md transition-shadow"
              onClick={() => navigate(resource.route)}
            >
              <div className={resource.color}>
                {resource.icon}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-sm">{resource.name}</span>
                <span className="text-xs text-muted-foreground">
                  {resource.description}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
