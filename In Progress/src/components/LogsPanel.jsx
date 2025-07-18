import React, { useState } from "react";
import { useLogs } from "../hooks/useLogs";
import { CheckCircle, AlertTriangle, XCircle, MinusCircle, Search, Filter, Download, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { PremiumCard, StatusIndicator } from "./AnimatedCard";

const typeIcons = {
  inspection_complete: <CheckCircle className="text-accent-emerald w-4 h-4" />,
  inspection_ended: <AlertTriangle className="text-accent-amber w-4 h-4" />,
  asset_failed: <XCircle className="text-accent-rose w-4 h-4" />,
  area_noncompliance: <XCircle className="text-accent-rose w-4 h-4" />,
  user_login: <MinusCircle className="text-text-muted w-4 h-4" />,
  user_logout: <MinusCircle className="text-text-muted w-4 h-4" />,
  user_added: <CheckCircle className="text-nexus-gold w-4 h-4" />,
  user_removed: <XCircle className="text-text-muted w-4 h-4" />,
  default: <Activity className="text-text-secondary w-4 h-4" />,
};

function getIcon(type) {
  return typeIcons[type] || typeIcons.default;
}

function getBadgeColor(type) {
  switch (type) {
    case "inspection_complete":
      return "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30";
    case "inspection_ended":
      return "bg-nexus-gold/20 text-nexus-gold border border-nexus-gold/30";
    case "asset_failed":
    case "area_noncompliance":
      return "bg-accent-rose/20 text-accent-rose border border-accent-rose/30";
    case "user_added":
      return "bg-nexus-gold/20 text-nexus-gold border border-nexus-gold/30";
    case "user_removed":
      return "bg-text-muted/20 text-text-muted border border-text-muted/30";
    default:
      return "bg-surface-secondary text-text-secondary border border-border-razor";
  }
}

function isImportantLog(type) {
  return type === "inspection_complete" || 
         type === "inspection_ended" || 
         type === "asset_failed" || 
         type === "area_noncompliance";
}

function getStatusColor(type) {
  switch (type) {
    case "inspection_complete":
      return "online";
    case "asset_failed":
    case "area_noncompliance":
      return "critical";
    case "inspection_ended":
      return "warning";
    default:
      return "info";
  }
}

export default function LogsPanel({ clientId }) {
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);
  const { logs, loading, error } = useLogs(clientId, showOnlyImportant);

  const importantLogs = logs?.filter(log => isImportantLog(log.type)) || [];
  const totalLogs = logs?.length || 0;

  return (
    <div className="p-6 space-y-6 bg-obsidian min-h-screen">
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline font-display font-semibold text-text-primary">
            Logs & Audit Trail
          </h2>
          <p className="text-text-secondary text-body mt-1">System activity and security monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary-premium flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
          <button className="btn-secondary-premium flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <button className="btn-premium flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-caption font-medium">Total Logs</p>
              <p className="text-display-3 font-display font-semibold text-text-primary">
                {totalLogs}
              </p>
            </div>
            <div className="w-10 h-10 bg-accent-blue/20 flex items-center justify-center rounded-refined border border-border-razor">
              <Activity className="w-5 h-5 text-accent-blue" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-caption font-medium">Important</p>
              <p className="text-display-3 font-display font-semibold text-accent-amber">
                {importantLogs.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-accent-amber/20 flex items-center justify-center rounded-refined border border-border-razor">
              <StatusIndicator status="warning" size="lg" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-caption font-medium">Critical</p>
              <p className="text-display-3 font-display font-semibold text-accent-rose">
                {logs?.filter(log => log.type === "asset_failed" || log.type === "area_noncompliance").length || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-accent-rose/20 flex items-center justify-center rounded-refined border border-border-razor">
              <StatusIndicator status="critical" size="lg" pulse={true} />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-caption font-medium">Success Rate</p>
              <p className="text-display-3 font-display font-semibold text-accent-emerald">
                {totalLogs ? Math.round(((totalLogs - importantLogs.length) / totalLogs) * 100) : 100}%
              </p>
            </div>
            <div className="w-10 h-10 bg-accent-emerald/20 flex items-center justify-center rounded-refined border border-border-razor">
              <StatusIndicator status="online" size="lg" />
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Filter Toggle */}
      <PremiumCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIndicator status="info" size="md" />
            <span className="text-text-primary font-medium">Filter Options</span>
          </div>
          <label className="flex items-center gap-3 text-text-secondary cursor-pointer">
            <span className="text-sm">Show Only Important</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={showOnlyImportant}
                onChange={e => setShowOnlyImportant(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${
                showOnlyImportant ? 'bg-nexus-gold' : 'bg-surface-secondary'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform transform ${
                  showOnlyImportant ? 'translate-x-5' : 'translate-x-1'
                } mt-1`} />
              </div>
            </div>
          </label>
        </div>
      </PremiumCard>

      {/* Logs Table */}
      <PremiumCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-title font-display font-semibold text-text-primary">Recent Activity</h3>
          <div className="flex items-center space-x-2">
            <StatusIndicator status="online" size="sm" />
            <span className="text-sm text-text-secondary">Live Feed</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-razor">
                <th className="text-left py-3 px-4 text-text-secondary text-caption font-medium"></th>
                <th className="text-left py-3 px-4 text-text-secondary text-caption font-medium">Event</th>
                <th className="text-left py-3 px-4 text-text-secondary text-caption font-medium">User/Asset</th>
                <th className="text-left py-3 px-4 text-text-secondary text-caption font-medium">Timestamp</th>
                <th className="text-left py-3 px-4 text-text-secondary text-caption font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center text-text-muted py-10">Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="text-center text-accent-rose py-10">{error.message}</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-text-muted py-10">No logs yet.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <motion.tr 
                    key={log.id}
                    className="border-b border-border-razor hover:bg-surface-glass-hover transition-colors"
                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="py-3 px-4">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {getIcon(log.type)}
                      </motion.div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-sharp text-xs font-medium ${getBadgeColor(log.type)}`}>
                        {log.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-primary">
                      {log.username || log.assetId || log.area || "—"}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {log.details || "-"}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  );
} 