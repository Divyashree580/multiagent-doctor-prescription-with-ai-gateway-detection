/**
 * Violation Detail Modal Component
 * Shows detailed information about a specific violation
 */

'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Violation {
  id: string;
  sessionId: string;
  createdAt: string;
  agentType: string;
  complianceStatus: string;
  violationType: string;
  policyRuleId: string;
  blocked: boolean;
}

interface ViolationDetailModalProps {
  violation: Violation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViolationDetailModal({
  violation,
  open,
  onOpenChange,
}: ViolationDetailModalProps) {
  const [fullViolation, setFullViolation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!violation) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/audit/logs/${violation.id}`);
        if (response.ok) {
          const data = await response.json();
          setFullViolation(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch violation details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchDetails();
    }
  }, [violation, open]);

  if (!violation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Violation Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={
                violation.complianceStatus === 'VIOLATION' ? 'destructive' : 'secondary'
              }
            >
              {violation.complianceStatus}
            </Badge>
            <Badge variant="outline">{violation.agentType}</Badge>
            {violation.blocked && (
              <Badge variant="destructive" className="text-xs">
                🚫 Blocked
              </Badge>
            )}
          </div>

          {/* Key Information */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="session">Session</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Violation Type
                  </p>
                  <p className="font-mono text-sm">{violation.violationType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Policy Rule
                  </p>
                  <p className="font-mono text-sm">{violation.policyRuleId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Agent Type
                  </p>
                  <p className="font-mono text-sm">{violation.agentType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Status
                  </p>
                  <p className="font-mono text-sm">{violation.complianceStatus}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Timestamp
                </p>
                <p className="text-sm">
                  {new Date(violation.createdAt).toLocaleString()}
                </p>
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-3">
              {loading ? (
                <p className="text-gray-500">Loading details...</p>
              ) : fullViolation ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                      Content Hash
                    </p>
                    <p className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                      {fullViolation.contentHash}
                    </p>
                  </div>
                  {fullViolation.contentSummary && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                        Summary
                      </p>
                      <p className="text-sm bg-gray-50 p-2 rounded">
                        {fullViolation.contentSummary}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                      Latency
                    </p>
                    <p className="text-sm">{fullViolation.latencyMs}ms</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                      Trace ID
                    </p>
                    <p className="font-mono text-xs">{fullViolation.traceId}</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">Unable to load details</p>
              )}
            </TabsContent>

            {/* Session Tab */}
            <TabsContent value="session" className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Session ID
                </p>
                <p className="font-mono text-sm break-all">{violation.sessionId}</p>
              </div>
              {fullViolation?.parentTraceId && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Parent Trace ID
                  </p>
                  <p className="font-mono text-sm break-all">
                    {fullViolation.parentTraceId}
                  </p>
                </div>
              )}
              <button
                className="text-blue-600 hover:underline text-sm"
                onClick={() => {
                  // Could navigate to session details
                  console.log('View session logs for:', violation.sessionId);
                }}
              >
                View all session logs →
              </button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
