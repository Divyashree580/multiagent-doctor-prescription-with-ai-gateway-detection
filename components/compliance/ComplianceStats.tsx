/**
 * Compliance Statistics Component
 * Displays key compliance metrics and KPIs
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComplianceStatsProps {
  stats: {
    totalLogs: number;
    compliant: number;
    violations: number;
    needsReview: number;
    blocked: number;
    compliancePercentage: number;
    violationPercentage: number;
    blockRate: number;
  };
}

export default function ComplianceStats({ stats }: ComplianceStatsProps) {
  const getComplianceColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBlockRateColor = (rate: number) => {
    if (rate >= 5) return 'text-red-600';
    if (rate >= 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* Total Logs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-gray-500 uppercase">Total Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Compliant */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-green-700 uppercase">Compliant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.compliant.toLocaleString()}</div>
          <p className="text-xs text-green-600 mt-1">{stats.compliancePercentage.toFixed(1)}%</p>
        </CardContent>
      </Card>

      {/* Violations */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-red-700 uppercase">Violations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.violations.toLocaleString()}</div>
          <p className="text-xs text-red-600 mt-1">{stats.violationPercentage.toFixed(1)}%</p>
        </CardContent>
      </Card>

      {/* Needs Review */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-yellow-700 uppercase">Needs Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.needsReview.toLocaleString()}</div>
          <p className="text-xs text-yellow-600 mt-1">
            {((stats.needsReview / stats.totalLogs) * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* Blocked */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-orange-700 uppercase">Blocked</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.blocked.toLocaleString()}</div>
          <p className="text-xs text-orange-600 mt-1">{stats.blockRate.toFixed(1)}% rate</p>
        </CardContent>
      </Card>
    </div>
  );
}
