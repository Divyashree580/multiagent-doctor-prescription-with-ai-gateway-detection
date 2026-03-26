/**
 * Log Trace Viewer Component
 * Displays detailed trace information including why rules are triggered and broken
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LogTrace {
  id: string;
  sessionId: string;
  traceId: string;
  parentTraceId?: string;
  agentType: string;
  callDirection: string;
  complianceStatus: string;
  violationType?: string;
  policyRuleId?: string;
  contentSummary?: string;
  latencyMs: number;
  blocked: boolean;
  createdAt: string;
  reason?: string;
  explanation?: string;
  relatedRules?: Array<{
    ruleId: string;
    ruleName: string;
    triggered: boolean;
    reason?: string;
  }>;
  trace?: Array<{
    step: number;
    action: string;
    result: string;
    details: string;
  }>;
}

interface LogTraceViewerProps {
  log: LogTrace;
}

export default function LogTraceViewer({ log }: LogTraceViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-green-50 border-green-200';
      case 'VIOLATION':
        return 'bg-red-50 border-red-200';
      case 'NEEDS_REVIEW':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return { variant: 'outline' as const, className: 'text-green-700 border-green-300' };
      case 'VIOLATION':
        return { variant: 'destructive' as const };
      case 'NEEDS_REVIEW':
        return { variant: 'secondary' as const };
      default:
        return { variant: 'outline' as const };
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'REQUEST' ? '📤' : '📥';
  };

  const getAgentIcon = (agent: string) => {
    return agent === 'SUPERVISOR' ? '👔' : '🔧';
  };

  return (
    <div className="space-y-4 w-full">
      {/* Main Status Card */}
      <Card className={`border-2 ${getStatusColor(log.complianceStatus)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{getAgentIcon(log.agentType)}</span>
                <span className="text-xl">{getDirectionIcon(log.callDirection)}</span>
                <Badge {...getStatusBadge(log.complianceStatus)}>
                  {log.complianceStatus}
                </Badge>
                {log.blocked && (
                  <Badge variant="destructive" className="text-xs">
                    🚫 BLOCKED
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">
                {log.agentType} Agent - {log.callDirection}
              </CardTitle>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {new Date(log.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Latency: {log.latencyMs}ms
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Session ID</p>
                    <p className="text-sm font-mono text-gray-700 truncate" title={log.sessionId}>
                      {log.sessionId.substring(0, 20)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Trace ID</p>
                    <p className="text-sm font-mono text-gray-700 truncate" title={log.traceId}>
                      {log.traceId.substring(0, 20)}...
                    </p>
                  </div>
                </div>

                {log.contentSummary && (
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Content Summary
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-3">{log.contentSummary}</p>
                  </div>
                )}

                {log.reason && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                      Why This Log?
                    </p>
                    <p className="text-sm text-blue-900">{log.reason}</p>
                  </div>
                )}

                {log.explanation && (
                  <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <p className="text-xs font-semibold text-orange-700 uppercase mb-1">
                      Explanation
                    </p>
                    <p className="text-sm text-orange-900">{log.explanation}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-3">
          {log.complianceStatus === 'COMPLIANT' ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <p className="text-green-600 font-medium">✓ No violations detected</p>
                  <p className="text-gray-500 text-sm mt-1">This log passed all compliance checks</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {log.violationType && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-red-900">Violation Detected</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-red-700 uppercase mb-1">
                        Violation Type
                      </p>
                      <p className="text-sm text-red-900 font-medium">
                        {log.violationType.replace(/_/g, ' ')}
                      </p>
                    </div>

                    {log.policyRuleId && (
                      <div>
                        <p className="text-xs font-semibold text-red-700 uppercase mb-1">
                          Policy Rule
                        </p>
                        <p className="text-sm font-mono text-red-900">{log.policyRuleId}</p>
                      </div>
                    )}

                    {log.explanation && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-xs font-semibold text-red-700 uppercase mb-1">
                          Why Rule Was Broken
                        </p>
                        <p className="text-sm text-red-900 leading-relaxed">{log.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {log.relatedRules && log.relatedRules.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Related Rules Checked</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {log.relatedRules.map((rule, idx) => (
                      <div key={idx} className="border rounded p-2 bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={rule.triggered ? 'destructive' : 'outline'}
                              >
                                {rule.triggered ? '❌' : '✓'} {rule.ruleName}
                              </Badge>
                            </div>
                            <p className="text-xs font-mono text-gray-600">{rule.ruleId}</p>
                            {rule.reason && (
                              <p className="text-xs text-gray-700 mt-1">{rule.reason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Trace Tab */}
        <TabsContent value="trace" className="space-y-3">
          {log.trace && log.trace.length > 0 ? (
            <div className="space-y-2">
              {log.trace.map((step, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">{step.action}</div>
                        <div className="mb-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                              step.result === 'SUCCESS'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {step.result}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {step.details}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-4">No trace information available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Log Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Log ID</p>
                  <p className="font-mono text-gray-700 truncate" title={log.id}>
                    {log.id}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Agent Type</p>
                  <p className="text-gray-700 font-medium">{log.agentType}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Call Direction
                  </p>
                  <p className="text-gray-700 font-medium">{log.callDirection}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Latency</p>
                  <p className="text-gray-700 font-medium">{log.latencyMs}ms</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Compliance</p>
                  <p className="text-gray-700 font-medium">{log.complianceStatus}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</p>
                  <p className="text-gray-700 font-medium">
                    {log.blocked ? '🚫 Blocked' : '✓ Allowed'}
                  </p>
                </div>
              </div>

              {log.parentTraceId && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                    Parent Trace ID
                  </p>
                  <p className="font-mono text-blue-900 truncate text-sm" title={log.parentTraceId}>
                    {log.parentTraceId}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Timestamp</p>
                <p className="text-gray-700 text-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(log.createdAt).toISOString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
