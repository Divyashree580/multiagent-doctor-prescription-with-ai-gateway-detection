/**
 * Audit Log Viewer Component
 * Advanced filtering and searching of audit logs with normal and alert categorization
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogTraceViewer from "./LogTraceViewer";

interface AuditLog {
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
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [activeTab, setActiveTab] = useState("all"); // all, normal, alert
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    sessionId: "",
    agentType: "all",
    complianceStatus: "all",
    violationType: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [page, filters, activeTab]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.sessionId) params.append("sessionId", filters.sessionId);
      if (filters.agentType !== "all")
        params.append("agentType", filters.agentType);
      if (filters.complianceStatus !== "all")
        params.append("complianceStatus", filters.complianceStatus);
      if (filters.violationType)
        params.append("violationType", filters.violationType);

      // Apply tab filtering for normal vs alert logs
      if (activeTab === "alert") {
        params.append("complianceStatus", "VIOLATION");
      } else if (activeTab === "normal") {
        params.append("complianceStatus", "COMPLIANT");
      }

      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLIANT":
        return "text-green-600 bg-green-50";
      case "VIOLATION":
        return "text-red-600 bg-red-50";
      case "NEEDS_REVIEW":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLIANT":
        return { variant: "outline" as const, className: "text-green-700" };
      case "VIOLATION":
        return { variant: "destructive" as const };
      case "NEEDS_REVIEW":
        return { variant: "secondary" as const };
      default:
        return { variant: "outline" as const };
    }
  };

  const isAlertLog = (log: AuditLog) => 
    log.complianceStatus === "VIOLATION" || 
    (log.complianceStatus === "NEEDS_REVIEW" && log.blocked);

  const isNormalLog = (log: AuditLog) => log.complianceStatus === "COMPLIANT";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Audit Log Viewer</h2>
        <p className="text-gray-600 mt-1">
          Monitor all requests and responses with detailed compliance traces
        </p>
      </div>

      {/* Tab Selection: Normal vs Alert Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Categories</CardTitle>
          <CardDescription>View logs by type</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All Logs ({total})
              </TabsTrigger>
              <TabsTrigger value="normal">
                ✓ Normal ({logs.filter(isNormalLog).length})
              </TabsTrigger>
              <TabsTrigger value="alert">
                ⚠️ Alerts ({logs.filter(isAlertLog).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter & Search</CardTitle>
          <CardDescription>Narrow down logs by specific criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-700">
                Session ID
              </label>
              <Input
                placeholder="Search session ID..."
                value={filters.sessionId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, sessionId: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-700">
                Agent Type
              </label>
              <Select
                value={filters.agentType}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, agentType: value }))
                }
              >
                <option value="all">All Agents</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="SPECIALIST">Specialist</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-700">
                Status
              </label>
              <Select
                value={filters.complianceStatus}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, complianceStatus: value }))
                }
              >
                <option value="all">All Statuses</option>
                <option value="COMPLIANT">✓ Compliant</option>
                <option value="VIOLATION">✗ Violation</option>
                <option value="NEEDS_REVIEW">⚠️ Needs Review</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-gray-700">
                Violation Type
              </label>
              <Input
                placeholder="e.g., PRESCRIPTION_DETECTED"
                value={filters.violationType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    violationType: e.target.value,
                  }))
                }
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => {
              setPage(1);
              fetchLogs();
            }}>
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  sessionId: "",
                  agentType: "all",
                  complianceStatus: "all",
                  violationType: "",
                });
                setPage(1);
                setSelectedLog(null);
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Log Detail View */}
      {selectedLog && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Selected Log Details</CardTitle>
              <CardDescription>Full trace and violation information</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLog(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </Button>
          </CardHeader>
          <CardContent>
            <LogTraceViewer log={selectedLog} />
          </CardContent>
        </Card>
      )}

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {activeTab === "alert"
              ? "Alert Logs (Violations & Blocks)"
              : activeTab === "normal"
              ? "Normal Logs (Compliant)"
              : "All Audit Logs"}
          </CardTitle>
          <CardDescription>
            Showing {logs.length} of {total} logs
            {activeTab !== "all" && ` (${activeTab} view)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin text-2xl mb-2">⟳</div>
                <p className="text-gray-500">Loading logs...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No logs found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedLog?.id === log.id
                        ? "border-blue-400 bg-blue-50 shadow-md"
                        : isAlertLog(log)
                        ? "border-red-200 hover:border-red-300 hover:bg-red-50"
                        : "border-green-200 hover:border-green-300 hover:bg-green-50"
                    }`}
                    onClick={() => {
                      setSelectedLog(log);
                      setExpandedLogId(
                        expandedLogId === log.id ? null : log.id
                      );
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Log Type Indicator */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">
                            {isAlertLog(log) ? "⚠️" : "✓"}
                          </span>
                          <Badge {...getStatusBadgeVariant(log.complianceStatus)}>
                            {log.complianceStatus}
                          </Badge>
                          {log.blocked && (
                            <Badge variant="destructive" className="text-xs">
                              🚫 BLOCKED
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {log.agentType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {log.callDirection}
                          </Badge>
                        </div>

                        {/* Log Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Session</p>
                            <p className="font-mono text-xs text-gray-700">
                              {log.sessionId.substring(0, 12)}...
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Trace</p>
                            <p className="font-mono text-xs text-gray-700">
                              {log.traceId.substring(0, 12)}...
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Rule</p>
                            <p className="font-mono text-xs text-gray-700">
                              {log.policyRuleId || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Latency</p>
                            <p className="text-xs text-gray-700">{log.latencyMs}ms</p>
                          </div>
                        </div>

                        {/* Violation Type for Alert Logs */}
                        {isAlertLog(log) && log.violationType && (
                          <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                            <p className="text-xs font-semibold text-red-700">
                              ✗ {log.violationType.replace(/_/g, " ")}
                            </p>
                          </div>
                        )}

                        {/* Content Summary */}
                        {log.contentSummary && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <p className="font-medium mb-1">Summary:</p>
                            <p className="line-clamp-2">{log.contentSummary}</p>
                          </div>
                        )}

                        {/* Explanation for Violations */}
                        {log.explanation && isAlertLog(log) && (
                          <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded border border-red-300">
                            <p className="font-medium mb-1">Why Rule Broken:</p>
                            <p>{log.explanation}</p>
                          </div>
                        )}

                        {/* Time */}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={selectedLog?.id === log.id ? "default" : "outline"}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          {selectedLog?.id === log.id ? "View ↓" : "Details →"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Page {page} of {Math.ceil(total / limit)} • {total} total logs
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= total}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
