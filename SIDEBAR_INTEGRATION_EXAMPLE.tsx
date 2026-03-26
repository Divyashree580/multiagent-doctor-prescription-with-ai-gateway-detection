/**
 * INTEGRATION EXAMPLE: How to Add Compliance Monitoring to Existing Sidebar
 *
 * This shows how to modify the existing DashboardSidebar component
 * to include compliance & safety monitoring
 *
 * FILE: components/dashboard/sidebar.tsx (UPDATED)
 */

"use client";

import {
  MessageSquare,
  Pill,
  Languages,
  LogOut,
  User,
  FileText,
  Shield,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardSidebar({
  activeTab,
  onTabChange,
}: DashboardSidebarProps) {
  // EXISTING MENU ITEMS
  const menuItems = [
    {
      id: "chat",
      label: "Specialist Chat",
      icon: MessageSquare,
      description: "AI-powered medical consultation",
    },
    {
      id: "medicines",
      label: "Medicine Alternatives",
      icon: Pill,
      description: "Find affordable substitutes",
    },
    {
      id: "translator",
      label: "Translator",
      icon: Languages,
      description: "Multi-language support",
    },
    {
      id: "patient-records",
      label: "Patient Records",
      icon: FileText,
      description: "View consultation history",
    },
  ];

  // NEW: COMPLIANCE MENU ITEMS
  const complianceItems = [
    {
      id: "compliance",
      label: "Compliance Dashboard",
      icon: BarChart3,
      description: "Real-time compliance metrics",
      href: "/compliance",
      badge: "NEW",
    },
    {
      id: "violations",
      label: "Violations Report",
      icon: AlertCircle,
      description: "Detailed violations table",
      href: "/violations",
    },
    {
      id: "audit",
      label: "Audit Logs",
      icon: Shield,
      description: "Safety audit trail",
      href: "/audit",
    },
  ];

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // NEW: Compliance status state
  const [complianceStatus, setComplianceStatus] = useState<
    "safe" | "warning" | "critical"
  >("safe");
  const [violationCount, setViolationCount] = useState(0);
  const [loadingCompliance, setLoadingCompliance] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (!user) {
      window.location.href = "/login";
    }

    const userObj = JSON.parse(user || "{}");
    setEmail(userObj.email);
    setName(userObj.name);
  }, []);

  // NEW: Fetch compliance status on mount
  useEffect(() => {
    const fetchComplianceStatus = async () => {
      try {
        const response = await fetch("/api/audit/violations?limit=1");
        if (response.ok) {
          const data = await response.json();
          const total = data.summary?.totalViolations || 0;
          setViolationCount(total);

          if (total > 10) {
            setComplianceStatus("critical");
          } else if (total > 0) {
            setComplianceStatus("warning");
          } else {
            setComplianceStatus("safe");
          }
        }
      } catch (error) {
        console.error("Failed to fetch compliance status:", error);
      } finally {
        setLoadingCompliance(false);
      }
    };

    fetchComplianceStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchComplianceStatus, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // Helper function to get compliance status color
  const getComplianceColor = () => {
    switch (complianceStatus) {
      case "critical":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "safe":
      default:
        return "bg-green-500";
    }
  };

  return (
    <div className="w-64 border-r border-border/50 bg-card/40 backdrop-blur-sm flex flex-col h-screen sticky top-0">
      {/* Logo/Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Svasthya</h2>
            <p className="text-xs text-muted-foreground">Healthcare Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* EXISTING MENU ITEMS */}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full text-left p-4 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-primary" : ""
                  }`}
                />
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {/* NEW: COMPLIANCE DIVIDER */}
        <div className="my-4 pt-4 border-t border-border/30">
          <p className="text-xs font-semibold text-muted-foreground px-4 mb-2">
            COMPLIANCE & SAFETY
          </p>
        </div>

        {/* NEW: COMPLIANCE STATUS CARD */}
        <div
          className={`p-3 rounded-lg border-2 ${
            complianceStatus === "critical"
              ? "border-red-500 bg-red-50 dark:bg-red-950/20"
              : complianceStatus === "warning"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                : "border-green-500 bg-green-50 dark:bg-green-950/20"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`w-2 h-2 rounded-full ${getComplianceColor()}`}
            ></div>
            <span className="text-xs font-semibold">
              {complianceStatus === "critical"
                ? "🚨 Critical"
                : complianceStatus === "warning"
                  ? "⚠️ Review Needed"
                  : "✓ Compliant"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {loadingCompliance
              ? "Loading..."
              : `${violationCount} violation${violationCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* NEW: COMPLIANCE MENU ITEMS */}
        {complianceItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.id} href={item.href} className="w-full block">
              <button className="w-full text-left p-4 rounded-lg transition-all duration-200 group hover:bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent hover:border-border/50">
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{item.label}</p>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </button>
            </Link>
          );
        })}
      </div>

      {/* User Profile / Logout Section */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <div className="px-2 py-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Logged in as
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {name || email}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

/**
 * STEP-BY-STEP INTEGRATION INSTRUCTIONS:
 *
 * 1. BACKUP: Save current sidebar.tsx as sidebar.tsx.backup
 *
 * 2. IMPORTS: Add these imports to sidebar.tsx:
 *    - Icon imports: Shield, AlertCircle, BarChart3 from lucide-react
 *    - Badge component from @/components/ui/badge
 *    - Link from next/link
 *
 * 3. Add compliance menu items array (see complianceItems above)
 *
 * 4. Add compliance state variables:
 *    const [complianceStatus, setComplianceStatus] = useState<'safe' | 'warning' | 'critical'>('safe');
 *    const [violationCount, setViolationCount] = useState(0);
 *    const [loadingCompliance, setLoadingCompliance] = useState(true);
 *
 * 5. Add useEffect to fetch compliance status (see useEffect above)
 *
 * 6. Add compliance status card before compliance menu items (see JSX above)
 *
 * 7. Add compliance menu items loop (see JSX above)
 *
 * 8. TEST:
 *    - npm run dev
 *    - Navigate to /dashboard
 *    - Verify compliance section shows in sidebar
 *    - Check compliance status updates in real-time
 *
 * QUICK COPY-PASTE ADDITIONS:
 * ===========================
 *
 * Add these imports at the top:
 * ```
 * import { Shield, AlertCircle, BarChart3 } from "lucide-react"
 * import { Badge } from "@/components/ui/badge"
 * import Link from "next/link"
 * ```
 *
 * Add these state variables in useEffect:
 * ```
 * const [complianceStatus, setComplianceStatus] = useState<'safe' | 'warning' | 'critical'>('safe');
 * const [violationCount, setViolationCount] = useState(0);
 * const [loadingCompliance, setLoadingCompliance] = useState(true);
 * ```
 *
 * Add this useEffect after existing useEffect:
 * ```
 * useEffect(() => {
 *     const fetchComplianceStatus = async () => {
 *         try {
 *             const response = await fetch('/api/audit/violations?limit=1');
 *             if (response.ok) {
 *                 const data = await response.json();
 *                 const total = data.summary?.totalViolations || 0;
 *                 setViolationCount(total);
 *
 *                 if (total > 10) {
 *                     setComplianceStatus('critical');
 *                 } else if (total > 0) {
 *                     setComplianceStatus('warning');
 *                 } else {
 *                     setComplianceStatus('safe');
 *                 }
 *             }
 *         } catch (error) {
 *             console.error('Failed to fetch compliance status:', error);
 *         } finally {
 *             setLoadingCompliance(false);
 *         }
 *     };
 *
 *     fetchComplianceStatus();
 *     const interval = setInterval(fetchComplianceStatus, 30 * 1000);
 *     return () => clearInterval(interval);
 * }, []);
 * ```
 */
