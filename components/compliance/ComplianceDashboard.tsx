/**
 * Compliance Dashboard Component
 * Main dashboard for viewing medical safety violations and compliance metrics
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import ViolationsList from './ViolationsList';
import ComplianceStats from './ComplianceStats';
import ViolationTrend from './ViolationTrend';

interface DashboardData {
  overview: {
    totalLogs: number;
    compliant: number;
    violations: number;
    needsReview: number;
    blocked: number;
    compliancePercentage: number;
    violationPercentage: number;
    blockRate: number;
  };
  breakdown: {
    byAgentType: Array<{ agentType: string; count: number }>;
    byCallDirection: Array<{ callDirection: string; count: number }>;
    byViolationType: Array<{ violationType: string; count: number }>;
  };
  performance: {
    averageLatencyMs: number;
  };
  recentViolations: Array<{
    id: string;
    sessionId: string;
    createdAt: string;
    agentType: string;
    complianceStatus: string;
    violationType: string;
    policyRuleId: string;
    blocked: boolean;
  }>;
}

export default function ComplianceDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [filterType, setFilterType] = useState('all');

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Calculate date range
        const now = new Date();
        let from = new Date();
        
        if (timeRange === '24h') {
          from.setHours(from.getHours() - 24);
        } else if (timeRange === '7d') {
          from.setDate(from.getDate() - 7);
        } else if (timeRange === '30d') {
          from.setDate(from.getDate() - 30);
        }

        // Fetch stats
        const response = await fetch(
          `/api/audit/stats?from=${from.toISOString()}&to=${now.toISOString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch compliance data');
        }

        const data = await response.json();
        setDashboardData(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Loading compliance dashboard...</h2>
          <div className="inline-block animate-spin">⟳</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Dashboard</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Medical Safety & Compliance</h1>
          <p className="text-gray-600 mt-1">Real-time compliance monitoring dashboard</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </Select>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>

      {/* Overview Statistics */}
      {dashboardData && <ComplianceStats stats={dashboardData.overview} />}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {dashboardData?.overview.compliancePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dashboardData?.overview.compliant} compliant logs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {dashboardData?.overview.violations}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dashboardData?.overview.violationPercentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Blocked Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {dashboardData?.overview.blocked}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dashboardData?.overview.blockRate.toFixed(1)}% block rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {dashboardData?.performance.averageLatencyMs.toFixed(0)}ms
            </div>
            <p className="text-xs text-gray-500 mt-1">per compliance check</p>
          </CardContent>
        </Card>
      </div>

      {/* Trends and Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Violation Trend */}
        <div className="lg:col-span-2">
          {dashboardData && <ViolationTrend violations={dashboardData.breakdown.byViolationType} />}
        </div>

        {/* Violation Types Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Violation Breakdown</CardTitle>
            <CardDescription>By violation type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardData?.breakdown.byViolationType.map((item) => (
              <div key={item.violationType} className="flex justify-between items-center">
                <span className="text-sm">{item.violationType}</span>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Violations</CardTitle>
          <CardDescription>Most recent blocked or flagged interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData && <ViolationsList violations={dashboardData.recentViolations} />}
        </CardContent>
      </Card>

      {/* Agent Activity Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Agent Type</CardTitle>
            <CardDescription>Request distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardData?.breakdown.byAgentType.map((item) => (
              <div key={item.agentType} className="flex justify-between">
                <span className="text-sm">{item.agentType}</span>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Call Direction</CardTitle>
            <CardDescription>Request vs Response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardData?.breakdown.byCallDirection.map((item) => (
              <div key={item.callDirection} className="flex justify-between">
                <span className="text-sm">{item.callDirection}</span>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
