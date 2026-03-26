/**
 * Violation Detail Modal Component
 * Shows detailed information about a specific violation with traces
 */

'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LogTraceViewer from './LogTraceViewer';

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-red-600">⚠️</span>
            Violation Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin text-2xl mb-2">⟳</div>
              <p className="text-gray-500">Loading details...</p>
            </div>
          </div>
        ) : fullViolation ? (
          <LogTraceViewer log={fullViolation} />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Failed to load violation details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
