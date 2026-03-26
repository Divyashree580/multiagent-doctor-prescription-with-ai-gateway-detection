/**
 * Audit Log Viewer Component
 * Advanced filtering and searching of audit logs
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

interface AuditLog {
  id: string;
  sessionId: string;
  traceId: string;
  agentType: string;
  callDirection: string;
  complianceStatus: string;
  violationType: string;
  policyRuleId: string;
  latencyMs: number;
  blocked: boolean;
  createdAt: string;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    sessionId: "",
    agentType: "all",
    complianceStatus: "all",
    violationType: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Session ID
              </label>
              <Input
                placeholder="Search session ID..."
                value={filters.sessionId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, sessionId: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Agent Type
              </label>
              <Select
                value={filters.agentType}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, agentType: value }))
                }
              >
                <option value="all">All</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="SPECIALIST">Specialist</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={filters.complianceStatus}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, complianceStatus: value }))
                }
              >
                <option value="all">All</option>
                <option value="COMPLIANT">Compliant</option>
                <option value="VIOLATION">Violation</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Violation Type
              </label>
              <Input
                placeholder="e.g., RULE_001"
                value={filters.violationType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    violationType: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => fetchLogs()}>Apply Filters</Button>
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
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit Logs</CardTitle>
          <p className="text-sm text-gray-500">
            Showing {logs.length} of {total} total logs
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No logs found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium">Session</th>
                      <th className="text-left p-2 font-medium">Agent</th>
                      <th className="text-left p-2 font-medium">Direction</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Rule</th>
                      <th className="text-left p-2 font-medium">Latency</th>
                      <th className="text-left p-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">
                          {log.sessionId.substring(0, 8)}...
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {log.agentType}
                          </Badge>
                        </td>
                        <td className="p-2">{log.callDirection}</td>
                        <td className="p-2">
                          <Badge
                            className={`text-xs ${getStatusColor(log.complianceStatus)}`}
                          >
                            {log.complianceStatus}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-xs">
                          {log.policyRuleId || "-"}
                        </td>
                        <td className="p-2">{log.latencyMs}ms</td>
                        <td className="p-2 text-xs">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-600">
                  Page {page} of {Math.ceil(total / limit)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= total}
                  >
                    Next
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
