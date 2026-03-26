/**
 * Violation Trend Component
 * Displays violations by type in a chart format
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ViolationType {
  violationType: string;
  count: number;
}

interface ViolationTrendProps {
  violations: ViolationType[];
}

export default function ViolationTrend({ violations }: ViolationTrendProps) {
  const maxCount = Math.max(...violations.map(v => v.count), 1);
  const totalViolations = violations.reduce((sum, v) => sum + v.count, 0);

  const getViolationColor = (type: string) => {
    if (type.includes('RULE_001') || type.includes('RULE_101')) return 'bg-red-500';
    if (type.includes('RULE_002') || type.includes('RULE_102')) return 'bg-orange-500';
    if (type.includes('RULE_003')) return 'bg-red-700';
    if (type.includes('RULE_104')) return 'bg-orange-600';
    return 'bg-yellow-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Violation Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {violations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No violations</p>
        ) : (
          violations.map((violation) => (
            <div key={violation.violationType} className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{violation.violationType}</span>
                <Badge variant="secondary">{violation.count}</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${getViolationColor(violation.violationType)} transition-all`}
                  style={{
                    width: `${(violation.count / maxCount) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {((violation.count / totalViolations) * 100).toFixed(1)}% of total
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
