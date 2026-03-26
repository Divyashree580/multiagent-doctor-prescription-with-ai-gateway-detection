"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Violation {
  id: string;
  sessionId: string;
  traceId: string;
  agentType: string;
  callDirection: string;
  complianceStatus: string;
  violationType: string;
  policyRuleId: string;
  contentSummary: string;
  latencyMs: number;
  blocked: boolean;
  createdAt: string;
}

const RULE_DESCRIPTIONS: Record<string, { title: string; severity: string }> = {
  RULE_001: { title: "Prescription Request", severity: "CRITICAL" },
  RULE_002: { title: "Controlled Substance", severity: "CRITICAL" },
  RULE_003: { title: "Self-Harm Request", severity: "CRITICAL" },
  RULE_004: { title: "Prescription Document", severity: "CRITICAL" },
  RULE_005: { title: "Professional Impersonation", severity: "WARNING" },
  RULE_101: { title: "Drug + Dosage", severity: "CRITICAL" },
  RULE_102: { title: "Prescriptive Language", severity: "CRITICAL" },
  RULE_103: { title: "Firm Diagnosis", severity: "WARNING" },
  RULE_104: { title: "Dosage Modification", severity: "CRITICAL" },
  RULE_105: { title: "Treatment Recommendation", severity: "WARNING" },
};

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    blockedOnly: "true",
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchViolations();
  }, [page, filters]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        blockedOnly: filters.blockedOnly,
        from: `${filters.from}T00:00:00Z`,
        to: `${filters.to}T23:59:59Z`,
      });

      const response = await fetch(
        `/api/audit/violations?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setViolations(data.data);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch violations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Safety Violations Report
          </h1>
          <p className="text-gray-600 mt-2">
            Medical safety policy violations and blocked requests
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  From Date
                </label>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, from: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  To Date
                </label>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, to: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Show Only
                </label>
                <Select
                  value={filters.blockedOnly}
                  onValueChange={(value) => {
                    setFilters((prev) => ({ ...prev, blockedOnly: value }));
                    setPage(1);
                  }}
                >
                  <option value="true">Blocked Violations</option>
                  <option value="false">All Violations</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setPage(1);
                    fetchViolations();
                  }}
                  className="w-full"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Violations Table */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              Violations ({total} total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : violations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  ✓ No violations detected
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Keep up the good safety practices!
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-red-50">
                      <tr>
                        <th className="text-left p-3 font-semibold">Time</th>
                        <th className="text-left p-3 font-semibold">Rule</th>
                        <th className="text-left p-3 font-semibold">
                          Severity
                        </th>
                        <th className="text-left p-3 font-semibold">Type</th>
                        <th className="text-left p-3 font-semibold">Agent</th>
                        <th className="text-left p-3 font-semibold">
                          Direction
                        </th>
                        <th className="text-left p-3 font-semibold">Status</th>
                        <th className="text-left p-3 font-semibold">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.map((violation) => {
                        const ruleInfo = RULE_DESCRIPTIONS[
                          violation.policyRuleId
                        ] || {
                          title: "Unknown",
                          severity: "WARNING",
                        };
                        return (
                          <tr
                            key={violation.id}
                            className="border-b hover:bg-red-50 transition"
                          >
                            <td className="p-3 text-xs whitespace-nowrap">
                              {new Date(violation.createdAt).toLocaleString()}
                            </td>
                            <td className="p-3 font-mono text-xs font-semibold text-red-700">
                              {violation.policyRuleId}
                            </td>
                            <td className="p-3">
                              <Badge
                                className={getSeverityColor(ruleInfo.severity)}
                              >
                                {ruleInfo.severity}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {ruleInfo.title}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {violation.violationType}
                                </p>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">
                                {violation.agentType}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {violation.callDirection}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {violation.blocked ? (
                                <Badge className="bg-red-600 text-white">
                                  Blocked
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-600 text-white">
                                  Flagged
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-xs text-gray-600 max-w-xs truncate">
                              {violation.contentSummary || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-gray-600">
                    Page {page} of {Math.ceil(total / 20)}
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
                      disabled={page * 20 >= total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Policy Rules Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-red-700 mb-3">
                  🚫 Critical Violations (Block Immediately)
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    • <strong>RULE_001:</strong> Prescription requests
                  </p>
                  <p>
                    • <strong>RULE_002:</strong> Controlled substance requests
                  </p>
                  <p>
                    • <strong>RULE_003:</strong> Self-harm requests
                  </p>
                  <p>
                    • <strong>RULE_004:</strong> Prescription document requests
                  </p>
                  <p>
                    • <strong>RULE_101:</strong> Drug name + dosage combinations
                  </p>
                  <p>
                    • <strong>RULE_102:</strong> Prescriptive clinical language
                  </p>
                  <p>
                    • <strong>RULE_104:</strong> Dosage modification advice
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-yellow-700 mb-3">
                  ⚠️ Warning Violations (Flag for Review)
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    • <strong>RULE_005:</strong> Professional impersonation
                    attempts
                  </p>
                  <p>
                    • <strong>RULE_103:</strong> Definitive diagnosis without
                    hedging
                  </p>
                  <p>
                    • <strong>RULE_105:</strong> Treatment recommendations
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
