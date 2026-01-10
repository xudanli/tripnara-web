import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Train, Plane } from 'lucide-react';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';

interface BookingsTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

export default function BookingsTab({ tripId: _tripId, personaMode: _personaMode = 'abu' }: BookingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>预订入口</CardTitle>
          <CardDescription>酒店/交通预订入口聚合（可选，后期）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Hotel className="h-6 w-6" />
              <span>酒店预订</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Train className="h-6 w-6" />
              <span>交通预订</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Plane className="h-6 w-6" />
              <span>机票预订</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

