/**
 * Compliance & Safety Dashboard Navigation
 * 
 * Add this to your main layout or navbar for easy access to all compliance pages
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavLink {
  href: string;
  label: string;
  icon: string;
  description: string;
  badge?: string;
}

const COMPLIANCE_LINKS: NavLink[] = [
  {
    href: '/compliance',
    label: 'Compliance Dashboard',
    icon: '📊',
    description: 'Real-time compliance metrics and statistics',
    badge: 'NEW',
  },
  {
    href: '/violations',
    label: 'Violations Report',
    icon: '🚨',
    description: 'Detailed violations table with filtering',
  },
  {
    href: '/dashboard',
    label: 'Medical Dashboard',
    icon: '🏥',
    description: 'Main medical/chat dashboard',
  },
];

/**
 * Compliance Navigation Sidebar Component
 * Can be integrated into your layout
 */
export function ComplianceNavigation() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {COMPLIANCE_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link key={link.href} href={link.href}>
            <Button
              variant={isActive ? 'default' : 'outline'}
              className="w-full justify-start gap-2"
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
              {link.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {link.badge}
                </Badge>
              )}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Compliance Quick Links Card
 * Display on home page for quick access
 */
export function ComplianceQuickLinks() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COMPLIANCE_LINKS.map((link) => (
        <Link key={link.href} href={link.href}>
          <div className="p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer h-full">
            <div className="text-2xl mb-2">{link.icon}</div>
            <h3 className="font-semibold text-gray-900">{link.label}</h3>
            <p className="text-sm text-gray-600 mt-1">{link.description}</p>
            {link.badge && (
              <Badge variant="secondary" className="mt-3">
                {link.badge}
              </Badge>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

/**
 * Add to your main navbar/header
 * Shows compliance status indicator
 */
export function ComplianceStatusBadge() {
  const [status, setStatus] = React.useState<'safe' | 'warning' | 'critical'>('safe');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/audit/violations?limit=1');
        if (response.ok) {
          const data = await response.json();
          if (data.summary.totalViolations > 10) {
            setStatus('critical');
          } else if (data.summary.totalViolations > 0) {
            setStatus('warning');
          } else {
            setStatus('safe');
          }
        }
      } catch (error) {
        console.error('Failed to check compliance status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    // Check every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  const statusConfig = {
    safe: { color: 'bg-green-500', text: '✓ Compliant' },
    warning: { color: 'bg-yellow-500', text: '⚠️ Review Needed' },
    critical: { color: 'bg-red-500', text: '🚨 Critical' },
  };

  const config = statusConfig[status];

  return (
    <Link href="/compliance">
      <Badge className={`${config.color} text-white cursor-pointer`}>
        {config.text}
      </Badge>
    </Link>
  );
}

/**
 * Compliance Stats Widget
 * Quick overview for header/sidebar
 */
export function ComplianceStatsWidget() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/audit/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every minute
    const interval = setInterval(fetchStats, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-600">Loading compliance stats...</div>;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <p className="text-gray-600">Compliance</p>
        <p className="text-lg font-bold text-green-600">
          {stats.overview.compliancePercentage.toFixed(1)}%
        </p>
      </div>
      <div>
        <p className="text-gray-600">Blocked</p>
        <p className="text-lg font-bold text-red-600">{stats.overview.blocked}</p>
      </div>
      <div>
        <p className="text-gray-600">Total Violations</p>
        <p className="text-lg font-bold text-orange-600">
          {stats.overview.violations}
        </p>
      </div>
      <div>
        <p className="text-gray-600">Latency (ms)</p>
        <p className="text-lg font-bold text-blue-600">
          {Math.round(stats.performance.averageLatencyMs)}
        </p>
      </div>
    </div>
  );
}

/**
 * Integration Example for Layout
 * 
 * Add this to your main layout.tsx:
 * 
 * import { ComplianceStatusBadge, ComplianceNavigation } from '@/components/compliance/Navigation';
 * 
 * // In header or navbar:
 * <ComplianceStatusBadge />
 * 
 * // In sidebar:
 * <ComplianceNavigation />
 */
