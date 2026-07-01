/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Campaign, Submission, UserProfile, KpiTarget } from '../types';
import { 
  TrendingUp, Award, Download, Users, Layers, AlertTriangle, 
  MapPin, CheckCircle, Search, Clock, FileSpreadsheet, ListFilter 
} from 'lucide-react';

interface ManagerDashboardProps {
  profile: UserProfile;
  campaigns: Campaign[];
  submissions: Submission[];
  kpis: KpiTarget[];
  onRefreshData: () => Promise<void>;
}

export default function ManagerDashboard({
  profile,
  campaigns,
  submissions,
  kpis,
  onRefreshData
}: ManagerDashboardProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaigns[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Filter submissions based on Campaign + Region constraint (RLS validation)
  // Regional Managers can only access submissions in their assigned region (e.g., Western)
  const regionalSubmissions = submissions.filter(s => {
    // Campaign match
    const isCampMatch = selectedCampaignId ? s.campaign_id === selectedCampaignId : true;
    // Region match
    const isRegionMatch = s.region === profile.region;
    return isCampMatch && isRegionMatch;
  });

  // Calculate stats
  const totalSubmissions = regionalSubmissions.length;
  
  // Calculate regional KPI Target Progress
  const regionalTarget = kpis.find(k => 
    k.campaign_id === selectedCampaignId && 
    k.target_type === 'region' && 
    k.target_reference_id === profile.region
  );

  const targetVal = regionalTarget?.target_value || 500;
  const progressPct = Math.min(100, Math.round((totalSubmissions / targetVal) * 100));

  // Agent Leaderboard (Sarah, John, etc.)
  // Count submissions per agent id
  const agentSubCounts = regionalSubmissions.reduce((acc, sub) => {
    acc[sub.agent_id] = (acc[sub.agent_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Mock list of agents in region
  const localAgents = [
    { id: 'agent-id-123', name: 'Sarah Namubiru', email: 'agent@royalwaymedia.com', submissions: agentSubCounts['agent-id-123'] || 0, target: 100 },
    { id: 'agent-2', name: 'Joseph Okello', email: 'joseph@royalwaymedia.com', submissions: 14, target: 80 },
    { id: 'agent-3', name: 'Grace Kemigisha', email: 'grace@royalwaymedia.com', submissions: 5, target: 85 }
  ];

  // Sort agents
  const sortedAgents = [...localAgents].sort((a, b) => b.submissions - a.submissions);
  
  // Underperforming agents (less than 30% of target)
  const underperformingAgents = localAgents.filter(a => {
    const pct = (a.submissions / a.target) * 100;
    return pct < 35;
  });

  // Handle Export of Region Data
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Prepare CSV content
      const headers = ["Submission ID", "Customer Name", "Phone Number", "National ID", "Gender", "Region", "Agent", "Created At", "Custom Data"];
      const rows = regionalSubmissions.map(s => [
        s.id,
        s.full_name,
        s.phone_number,
        s.national_id || "N/A",
        s.gender,
        s.region,
        s.agent_id === 'agent-id-123' ? 'Sarah Namubiru' : s.agent_id,
        s.created_at,
        JSON.stringify(s.dynamic_data).replace(/,/g, ';')
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Royalway_${profile.region}_Region_${selectedCampaign?.name || 'Campaign'}_Export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Audit log the export
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({
          action: "REGIONAL_DATA_EXPORT",
          details: `Manager '${profile.full_name}' exported ${regionalSubmissions.length} submissions for region '${profile.region}' in campaign '${selectedCampaign?.name}'`
        })
      });

      alert("CSV exported successfully! Action registered in Audit Logs.");
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 font-sans">
      
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs bg-blue-50 text-blue-700 font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Regional Supervisor
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{profile.full_name}</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400" />
            Supervising territory: <span className="font-semibold text-slate-800">{profile.region} Region</span>
          </p>
        </div>

        {/* Campaign Selection filter */}
        <div className="flex items-center gap-2">
          <ListFilter size={15} className="text-slate-400" />
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overviews & Progress Grid */}
      <div className="grid md:grid-cols-3 gap-5 mb-6">
        
        {/* Total Submissions Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Region Submissions</span>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{totalSubmissions}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total active entries collected in {profile.region} region.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Online uploads: {regionalSubmissions.length}</span>
            <span>Pending syncs: 0</span>
          </div>
        </div>

        {/* KPI Target Progress Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Regional Target Progress</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                progressPct >= 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                progressPct >= 50 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {progressPct}% Achieved
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-bold font-mono text-slate-900">{totalSubmissions}</span>
              <span className="text-xs font-semibold text-slate-400">/ {targetVal} submissions target</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct >= 100 ? 'bg-emerald-500' :
                  progressPct >= 50 ? 'bg-blue-600' : 'bg-rose-500'
                }`}
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold flex justify-between mt-3">
            <span>On track to hit {selectedCampaign?.client_name} expectations.</span>
            <span>Target deadline: {selectedCampaign?.end_date}</span>
          </div>
        </div>

      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Leaderboard panel (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Territory Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-1.5">
              <Award className="text-amber-500" size={18} />
              Agent Leaderboard - {profile.region} Region
            </h2>
            
            <div className="space-y-2">
              {sortedAgents.map((agent, index) => {
                const pct = Math.min(100, Math.round((agent.submissions / agent.target) * 100));
                return (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        index === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{agent.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{agent.email}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-slate-900">{agent.submissions} Submissions</div>
                      <div className="text-[10px] text-slate-400 font-medium">{pct}% of target ({agent.target})</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submissions Data Viewer */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Regional Data Records</h2>
              <button
                onClick={handleExportCSV}
                disabled={exporting || regionalSubmissions.length === 0}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Download size={13} />
                {exporting ? 'Exporting...' : 'Export Territory CSV'}
              </button>
            </div>

            {regionalSubmissions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-xs">
                No regional data captured for the selected campaign.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold bg-slate-50/50 sticky top-0">
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Dynamic Fields</th>
                      <th className="p-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regionalSubmissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-2.5 font-semibold text-slate-800">{sub.full_name}</td>
                        <td className="p-2.5 text-slate-500 font-mono">{sub.phone_number}</td>
                        <td className="p-2.5">
                          {Object.keys(sub.dynamic_data).length > 0 ? (
                            <span className="font-mono text-[9px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block max-w-[150px] truncate">
                              {JSON.stringify(sub.dynamic_data)}
                            </span>
                          ) : <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="p-2.5 text-slate-400">{new Date(sub.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Supervision alerts (1 col) */}
        <div className="space-y-6">
          
          {/* Underperforming Alerts */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1 text-rose-600">
              <AlertTriangle size={16} />
              Performance Alerts
            </h2>
            <p className="text-xs text-slate-500 mb-3">Agents who are falling behind the assigned weekly campaign target thresholds:</p>

            {underperformingAgents.length === 0 ? (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex gap-2 items-start">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>All active regional field forces are on track or meeting target milestones. Excellent coordination!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {underperformingAgents.map(agent => {
                  const pct = Math.round((agent.submissions / agent.target) * 100);
                  return (
                    <div key={agent.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                      <div className="font-semibold text-xs text-rose-900">{agent.name}</div>
                      <div className="text-[10px] text-rose-700 mt-0.5 font-semibold">
                        Progress is critical: {pct}% achieved ({agent.submissions} / {agent.target} submissions)
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1 font-mono">{agent.email}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Region Heatmap Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1">
              <TrendingUp size={16} className="text-slate-500" />
              Regional Segmentation
            </h2>
            <p className="text-xs text-slate-500 mb-4">Visual density breakdown of customer segments targeted in your territory:</p>
            
            {/* Simulation of regional segmentation bars */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Rural Smallholders</span>
                  <span>{Math.round((regionalSubmissions.filter(s => s.segment_type === 'Rural').length / (totalSubmissions || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full" style={{ width: `${(regionalSubmissions.filter(s => s.segment_type === 'Rural').length / (totalSubmissions || 1)) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Semi-Urban Clusters</span>
                  <span>{Math.round((regionalSubmissions.filter(s => s.segment_type === 'Semi-Urban').length / (totalSubmissions || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${(regionalSubmissions.filter(s => s.segment_type === 'Semi-Urban').length / (totalSubmissions || 1)) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Urban Retailers/Merchants</span>
                  <span>{Math.round((regionalSubmissions.filter(s => s.segment_type === 'Urban').length / (totalSubmissions || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: `${(regionalSubmissions.filter(s => s.segment_type === 'Urban').length / (totalSubmissions || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
