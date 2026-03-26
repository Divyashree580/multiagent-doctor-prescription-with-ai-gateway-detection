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
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {violations.map((violation) => (
          <div
            key={violation.id}
            className="border rounded-lg p-3 hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-1">
                  <Badge variant={getStatusBadgeVariant(violation.complianceStatus)}>
                    {violation.complianceStatus}
                  </Badge>
                  <Badge variant="outline">{violation.agentType}</Badge>
                  {violation.blocked && (
                    <Badge variant="destructive" className="text-xs">
                      🚫 Blocked
                    </Badge>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Rule:</span> {violation.policyRuleId}
                  </p>
                  <p>
                    <span className="font-medium">Violation:</span> {violation.violationType}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Session: {violation.sessionId.substring(0, 8)}...
                  </p>
                  <p className="text-gray-500 text-xs">
                    {new Date(violation.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewDetails(violation)}
              >
                Details →
              </Button>
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
