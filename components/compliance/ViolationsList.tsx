/**
 * Violations List Component
 * Displays recent violations with details and actions
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ViolationDetailModal from './ViolationDetailModal';

interface Violation {
  id: string;
  sessionId: string;
  createdAt: string;
  agentType: string;
  complianceStatus: string;
  violationType: string;
  policyRuleId: string;
  blocked: boolean;
  contentSummary?: string;
  explanation?: string;
}

interface ViolationsListProps {
  violations: Violation[];
}

export default function ViolationsList({ violations }: ViolationsListProps) {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [showModal, setShowModal] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'VIOLATION':
        return 'destructive';
      case 'NEEDS_REVIEW':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getRiskColor = (blocked: boolean) => {
    return blocked ? 'text-red-600' : 'text-yellow-600';
  };

  const handleViewDetails = (violation: Violation) => {
    setSelectedViolation(violation);
    setShowModal(true);
  };

  if (violations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No violations found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {violations.map((violation) => (
          <div
            key={violation.id}
            className="border border-red-200 rounded-lg p-4 hover:bg-red-50 transition"
          >
            <div className="grid grid-cols-1 gap-3">
              {/* Top Row: Badges and Controls */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-2 items-center flex-wrap">
                  <Badge variant={getStatusBadgeVariant(violation.complianceStatus)}>
                    {violation.complianceStatus}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{violation.agentType}</Badge>
                  {violation.blocked && (
                    <Badge variant="destructive" className="text-xs">
                      🚫 Blocked
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(violation)}
                  className="whitespace-nowrap"
                >
                  View Details →
                </Button>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Rule:</span>
                  <p className="text-xs font-mono text-gray-600">{violation.policyRuleId}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Violation Type:</span>
                  <p className="text-xs text-gray-600">{violation.violationType.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Why Rule Was Broken */}
              {violation.explanation && (
                <div className="bg-red-50 border border-red-300 rounded p-2">
                  <p className="text-xs font-semibold text-red-700">Why Rule Broken:</p>
                  <p className="text-xs text-red-900 mt-1 line-clamp-2">{violation.explanation}</p>
                </div>
              )}

              {/* Content Summary */}
              {violation.contentSummary && (
                <div className="bg-gray-50 border border-gray-300 rounded p-2">
                  <p className="text-xs font-semibold text-gray-700">Summary:</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{violation.contentSummary}</p>
                </div>
              )}

              {/* Session and Time */}
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Session: {violation.sessionId.substring(0, 12)}...</span>
                <span>{new Date(violation.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedViolation && (
        <ViolationDetailModal
          violation={selectedViolation}
          open={showModal}
          onOpenChange={setShowModal}
        />
      )}
    </>
  );
}
