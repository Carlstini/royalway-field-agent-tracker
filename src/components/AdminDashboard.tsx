/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Campaign, UserProfile, CampaignAssignment, Submission, KpiTarget, AuditLog, CampaignField } from '../types';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  Layers, Users, TrendingUp, ShieldAlert, Plus, Check, X, Edit, Trash2, 
  MapPin, CheckCircle, Clock, Calendar, AlertCircle, FileSpreadsheet, Download, RefreshCw,
  Search, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';

interface AdminDashboardProps {
  profile: UserProfile;
  campaigns: Campaign[];
  submissions: Submission[];
  kpis: KpiTarget[];
  profiles: UserProfile[];
  assignments: CampaignAssignment[];
  auditLogs: AuditLog[];
  onRefreshData: () => Promise<void>;
}

export default function AdminDashboard({
  profile,
  campaigns,
  submissions,
  kpis,
  profiles,
  assignments,
  auditLogs,
  onRefreshData
}: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'campaigns' | 'users' | 'kpis' | 'logs'>('analytics');
  
  // Create Campaign Form State
  const [showCreateCampModal, setShowCreateCampModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campClient, setCampClient] = useState('');
  const [campType, setCampType] = useState<'bank' | 'telecom' | 'NGO' | 'FMCG' | 'government' | 'survey' | 'education' | 'other'>('bank');
  const [campDesc, setCampDesc] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [campSchema, setCampSchema] = useState<CampaignField[]>([]);
  const [editingCamp, setEditingCamp] = useState<Campaign | null>(null);

  // Schema Builder State
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CampaignField['field_type']>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Assign User State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCampaignId, setAssignCampaignId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'agent' | 'regional_manager'>('agent');
  const [assignRegion, setAssignRegion] = useState('Western');

  // Create KPI Target State
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [kpiCampaignId, setKpiCampaignId] = useState('');
  const [kpiTargetType, setKpiTargetType] = useState<'campaign' | 'region' | 'agent'>('campaign');
  const [kpiRefId, setKpiRefId] = useState('');
  const [kpiMetricName, setKpiMetricName] = useState('submissions');
  const [kpiValue, setKpiValue] = useState('');
  const [kpiStart, setKpiStart] = useState('');
  const [kpiEnd, setKpiEnd] = useState('');

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // --- Search, Filter, & Pagination States ---
  // 1. Workforce Directory (Active/Rejected Users)
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userRegionFilter, setUserRegionFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPerPage, setUserPerPage] = useState(10);

  // 2. Campaign Assignments
  const [assignSearch, setAssignSearch] = useState('');
  const [assignRegionFilter, setAssignRegionFilter] = useState('');
  const [assignRoleFilter, setAssignRoleFilter] = useState('');
  const [assignPage, setAssignPage] = useState(1);
  const [assignPerPage, setAssignPerPage] = useState(10);

  // 3. System Audit Logs
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPerPage, setLogPerPage] = useState(15);

  // 4. Campaigns List
  const [campSearch, setCampSearch] = useState('');
  const [campTypeFilter, setCampTypeFilter] = useState('');
  const [campStatusFilter, setCampStatusFilter] = useState('');
  const [campPage, setCampPage] = useState(1);
  const [campPerPage, setCampPerPage] = useState(6); // Grid view

  // Add field to campaign schema builder
  const addFieldToSchema = () => {
    if (!newFieldName || !newFieldLabel) {
      alert("Please provide both field name and field label.");
      return;
    }
    const cleanFieldName = newFieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Check if duplicate field key
    if (campSchema.some(f => f.field_name === cleanFieldName)) {
      alert("A field with this name already exists.");
      return;
    }

    const field: CampaignField = {
      id: `field-${Date.now()}`,
      field_name: cleanFieldName,
      field_label: newFieldLabel,
      field_type: newFieldType,
      required: newFieldRequired,
      visible: true,
      field_options: newFieldOptions ? newFieldOptions.split(',').map(o => o.trim()) : []
    };

    setCampSchema([...campSchema, field]);
    
    // Reset builder inputs
    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldOptions('');
  };

  const removeFieldFromSchema = (id: string) => {
    setCampSchema(campSchema.filter(f => f.id !== id));
  };

  // Handle Campaign Submit
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName || !campClient) return;

    setLoading(true);
    try {
      const payload = {
        name: campName,
        client_name: campClient,
        campaign_type: campType,
        description: campDesc,
        start_date: campStart,
        end_date: campEnd,
        submission_schema: campSchema
      };

      let url = '/api/campaigns';
      let method = 'POST';

      if (editingCamp) {
        url = `/api/campaigns/${editingCamp.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await onRefreshData();
        setShowCreateCampModal(false);
        resetCampaignForm();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditCampaign = (camp: Campaign) => {
    setEditingCamp(camp);
    setCampName(camp.name);
    setCampClient(camp.client_name);
    setCampType(camp.campaign_type);
    setCampDesc(camp.description);
    setCampStart(camp.start_date);
    setCampEnd(camp.end_date);
    setCampSchema(camp.submission_schema);
    setShowCreateCampModal(true);
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign? This will permanently wipe all regional assignments.")) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': profile.id }
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const updateCampaignStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const resetCampaignForm = () => {
    setEditingCamp(null);
    setCampName('');
    setCampClient('');
    setCampType('bank');
    setCampDesc('');
    setCampStart('');
    setCampEnd('');
    setCampSchema([]);
  };

  // User Management actions
  const approveUser = async (id: string, requestedRole: string, region: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({ role: requestedRole, region })
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const rejectUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/reject`, {
        method: 'POST',
        headers: { 'X-User-Id': profile.id }
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const updateUserRoleAndStatus = async (id: string, role: string, region: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({ role, region, status })
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (id === profile.id) {
      alert("You cannot delete your own admin account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete the workforce profile for ${name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 
          'X-User-Id': profile.id
        }
      });
      if (res.ok) {
        onRefreshData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete account.");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Handle Campaign Assignment Submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCampaignId || !assignUserId) return;

    try {
      const res = await fetch(`/api/campaigns/${assignCampaignId}/assignments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({
          user_id: assignUserId,
          role_in_campaign: assignRole,
          region_for_campaign: assignRegion
        })
      });
      if (res.ok) {
        await onRefreshData();
        setShowAssignModal(false);
      } else {
        const d = await res.json();
        alert(`Failed: ${d.error}`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const removeAssignment = async (assignId: string) => {
    if (!window.confirm("Are you sure you want to remove this assignment?")) return;
    try {
      const res = await fetch(`/api/campaign-assignments/${assignId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': profile.id }
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Handle KPI Target creation
  const handleKpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiCampaignId || !kpiValue) return;

    try {
      const res = await fetch('/api/kpis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({
          campaign_id: kpiCampaignId,
          target_type: kpiTargetType,
          target_reference_id: kpiTargetType === 'campaign' ? null : kpiRefId,
          metric_name: kpiMetricName,
          target_value: Number(kpiValue),
          start_date: kpiStart,
          end_date: kpiEnd
        })
      });
      if (res.ok) {
        await onRefreshData();
        setShowKpiModal(false);
        setKpiValue('');
        setKpiRefId('');
      } else {
        const d = await res.json();
        alert(`Failed: ${d.error}`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteKpi = async (id: string) => {
    if (!window.confirm("Delete this target?")) return;
    try {
      const res = await fetch(`/api/kpis/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': profile.id }
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Global Export tool
  const handleGlobalExportCSV = async () => {
    setExporting(true);
    try {
      const headers = ["ID", "Campaign ID", "Agent ID", "Customer Name", "Phone", "National ID", "Gender", "Region", "Created At", "Dynamic Data JSON"];
      const rows = submissions.map(s => [
        s.id,
        s.campaign_id,
        s.agent_id,
        s.full_name,
        s.phone_number,
        s.national_id || "",
        s.gender,
        s.region,
        s.created_at,
        JSON.stringify(s.dynamic_data).replace(/,/g, ';')
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Royalway_Global_Operations_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Audit log the export action
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({
          action: "GLOBAL_DATA_EXPORT",
          details: `Admin '${profile.full_name}' triggered a global CSV export of ${submissions.length} submissions across all territories.`
        })
      });

      alert("CSV exported successfully! Action registered in Audit Logs.");
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Calculations for Admin Analytics charts
  // Chart 1: Submissions by Campaign comparison
  const campaignChartData = campaigns.map(c => {
    const subCount = submissions.filter(s => s.campaign_id === c.id).length;
    // Calculate sum target
    const target = kpis.filter(k => k.campaign_id === c.id && k.target_type === 'campaign')
                      .reduce((sum, k) => sum + k.target_value, 0);
    return {
      name: c.client_name,
      submissions: subCount,
      target: target || 500
    };
  });

  // Chart 2: Submissions by Region
  const regionsList = ["Central", "Western", "Eastern", "Northern"];
  const regionChartData = regionsList.map(r => {
    const count = submissions.filter(s => s.region === r).length;
    return {
      name: r,
      Submissions: count
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
      
      {/* Admin Nav & Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div>
          <span className="text-xs bg-purple-50 text-purple-700 font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            System Administrator
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Royalway Operational Command</h1>
          <p className="text-xs text-slate-500 mt-1">Multi-campaign governance, dynamic schemas, and secure workforce approval systems.</p>
        </div>

        {/* Admin Navigation Links */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'analytics' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            📊 Analytics & KPIs
          </button>
          <button
            onClick={() => setActiveSubTab('campaigns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'campaigns' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚙️ Campaigns & Builder
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'users' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            👥 Users & Approvals ({profiles.filter(p => p.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveSubTab('kpis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'kpis' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎯 Target Management
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'logs' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            📝 Audit Logs
          </button>
        </div>
      </div>

      {/* QUICK STATS HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Campaigns</div>
          <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{campaigns.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Submissions</div>
          <div className="text-2xl font-bold font-mono text-slate-950 mt-1">{submissions.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Approved Agents</div>
          <div className="text-2xl font-bold font-mono text-slate-950 mt-1">
            {profiles.filter(p => p.role === 'agent' && p.status === 'approved').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Registrations</div>
          <div className="text-2xl font-bold font-mono text-purple-700 mt-1">
            {profiles.filter(p => p.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* ================= ADMIN TAB: ANALYTICS & KPIS ================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Campaign Comparison Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">Campaign Submission vs Targets</h3>
                <span className="text-[11px] text-slate-400 font-semibold font-mono">Real-time metric synthesis</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="submissions" fill="#0f172a" radius={[4, 4, 0, 0]} name="Actual Submissions" />
                    <Bar dataKey="target" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Target Value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Region Density Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Territory Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={regionChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="Submissions" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Reporting actions & Top performers list */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">Operations Global Export Centre</h3>
                <button
                  onClick={handleGlobalExportCSV}
                  disabled={exporting || submissions.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow"
                >
                  <Download size={14} />
                  {exporting ? 'Processing CSV...' : 'Export Complete Database (CSV)'}
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Compile and export all Uganda territory submissions, universal KYC profiles, and customized dynamic data fields. Exports are automatically tracked inside the secure ledger (Audit Logs) for governance compliance.
              </p>
              
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono text-slate-600">
                ✏️ <b>Security constraint:</b> Access to export functions is restricted exclusively to Admin and authorized Territory Supervisor profiles. Field Agent logons do not receive export capability.
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Workforce Leaderboard</h3>
              
              <div className="space-y-3">
                {profiles.filter(p => p.role === 'agent').slice(0, 3).map((agent, i) => {
                  const agentSubs = submissions.filter(s => s.agent_id === agent.id).length;
                  return (
                    <div key={agent.id} className="flex items-center justify-between text-xs p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-500">#{i+1}</span>
                        <div>
                          <div className="font-semibold text-slate-900">{agent.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{agent.region}</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-800">{agentSubs} Submissions</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= ADMIN TAB: CAMPAIGNS & DYNAMIC BUILDER ================= */}
      {activeSubTab === 'campaigns' && (() => {
        const filteredCampaigns = campaigns.filter(camp => {
          if (campTypeFilter && camp.campaign_type !== campTypeFilter) return false;
          if (campStatusFilter && camp.status !== campStatusFilter) return false;
          if (campSearch) {
            const s = campSearch.toLowerCase();
            return (
              camp.name?.toLowerCase().includes(s) ||
              camp.client_name?.toLowerCase().includes(s) ||
              camp.description?.toLowerCase().includes(s) ||
              camp.campaign_type?.toLowerCase().includes(s)
            );
          }
          return true;
        });

        const campTotalPages = Math.ceil(filteredCampaigns.length / campPerPage) || 1;
        const campSafePage = Math.min(campPage, campTotalPages);
        const paginatedCampaigns = filteredCampaigns.slice((campSafePage - 1) * campPerPage, campSafePage * campPerPage);

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Campaign Management Hub</h2>
                <p className="text-xs text-slate-500">Design dynamic fields, form schemas, and map regional workforces.</p>
              </div>
              <button
                id="btn-create-campaign-modal"
                onClick={() => {
                  resetCampaignForm();
                  setShowCreateCampModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition-all shadow-sm self-end sm:self-auto"
              >
                <Plus size={15} /> Add Campaign & Build Schema
              </button>
            </div>

            {/* Campaign Search & Filters Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaigns by name, client..."
                  value={campSearch}
                  onChange={(e) => {
                    setCampSearch(e.target.value);
                    setCampPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-700"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                  <Filter size={13} />
                  <span>Filters:</span>
                </div>

                <select
                  value={campTypeFilter}
                  onChange={(e) => {
                    setCampTypeFilter(e.target.value);
                    setCampPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs px-2.5 py-2 rounded-xl font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="survey">Survey</option>
                  <option value="kyc">KYC</option>
                  <option value="lead_gen">Lead Generation</option>
                  <option value="verification">Verification</option>
                </select>

                <select
                  value={campStatusFilter}
                  onChange={(e) => {
                    setCampStatusFilter(e.target.value);
                    setCampPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs px-2.5 py-2 rounded-xl font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>

                {(campSearch || campTypeFilter || campStatusFilter) && (
                  <button
                    onClick={() => {
                      setCampSearch('');
                      setCampTypeFilter('');
                      setCampStatusFilter('');
                      setCampPage(1);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* List of campaigns */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedCampaigns.map(camp => {
                const campSubs = submissions.filter(s => s.campaign_id === camp.id).length;
                return (
                  <div key={camp.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
                          {camp.campaign_type}
                        </span>
                        
                        {/* Status select controller */}
                        <select
                          value={camp.status}
                          onChange={(e) => updateCampaignStatus(camp.id, e.target.value)}
                          className={`text-[10px] font-bold px-2 py-0.5 border border-transparent rounded focus:outline-none ${
                            camp.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                            camp.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                            camp.status === 'paused' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base">{camp.name}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Client: {camp.client_name}</p>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{camp.description}</p>
                      
                      {/* Render custom schema highlights */}
                      <div className="mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="text-[10px] uppercase text-slate-400 tracking-wider font-bold mb-1">Custom Fields Built</div>
                        {camp.submission_schema.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No custom fields (Universal KYC only)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {camp.submission_schema.map(f => (
                              <span key={f.id} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                {f.field_label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Submissions: <span className="font-bold text-slate-800">{campSubs}</span>
                      </span>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => startEditCampaign(camp)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-950 rounded-lg transition-colors"
                          title="Edit campaign and fields"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => deleteCampaign(camp.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete campaign"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {paginatedCampaigns.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-slate-100 rounded-2xl italic text-xs">
                  No campaigns matched the query or filter criteria.
                </div>
              )}
            </div>

            {/* Campaigns Pagination Footer */}
            {filteredCampaigns.length > 0 && (
              <div className="flex items-center justify-between gap-4 mt-2 text-xs text-slate-500 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                <div>
                  Showing <span className="font-semibold text-slate-800">{(campSafePage - 1) * campPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-slate-800">
                    {Math.min(campSafePage * campPerPage, filteredCampaigns.length)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-800">{filteredCampaigns.length}</span> campaigns
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCampPage(prev => Math.max(prev - 1, 1))}
                    disabled={campSafePage === 1}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: campTotalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCampPage(i + 1)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold ${
                          campSafePage === i + 1
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCampPage(prev => Math.min(prev + 1, campTotalPages))}
                    disabled={campSafePage === campTotalPages}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}


          {/* DYNAMIC CAMPAIGN & FORM FIELD SCHEMA BUILDER MODAL */}
          {showCreateCampModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">
                    {editingCamp ? 'Modify Campaign Config' : 'Create Campaign & Configure Form Schema'}
                  </h3>
                  <button onClick={() => setShowCreateCampModal(false)} className="text-slate-300 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCampaignSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                  
                  {/* Campaign Parameters */}
                  <div className="grid md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign Operational Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Centenary Agri Onboarding"
                        value={campName}
                        onChange={(e) => setCampName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Client Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Centenary Bank"
                        value={campClient}
                        onChange={(e) => setCampClient(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign Sector Type</label>
                      <select
                        value={campType}
                        onChange={(e) => setCampType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="bank">Banking Activation</option>
                        <option value="telecom">Telecom Registrations</option>
                        <option value="NGO">NGO Farmer Mapping</option>
                        <option value="FMCG">FMCG Retail/Coupon Campaigns</option>
                        <option value="government">Government activations</option>
                        <option value="survey">Field Surveys</option>
                        <option value="education">Education activations</option>
                        <option value="other">Other activities</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={campStart}
                          onChange={(e) => setCampStart(e.target.value)}
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={campEnd}
                          onChange={(e) => setCampEnd(e.target.value)}
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign Description</label>
                    <textarea
                      rows={2}
                      placeholder="Operational directives, objectives, guidelines for agents in Uganda territory..."
                      value={campDesc}
                      onChange={(e) => setCampDesc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs"
                    />
                  </div>

                  {/* Schema Form Builder */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center justify-between">
                      <span>FORM BUILDER: Add Custom Operational Fields</span>
                      <span className="text-[10px] text-slate-400 font-normal italic">No Code Schema Design</span>
                    </h4>
                    
                    {/* Active Fields list */}
                    {campSchema.length > 0 && (
                      <div className="mb-4 bg-white p-2 rounded-xl border border-slate-200 flex flex-wrap gap-1.5">
                        {campSchema.map(f => (
                          <span key={f.id} className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                            <span className="font-mono text-[10px] bg-slate-200 px-1 py-0.2 rounded text-slate-500 uppercase font-bold">{f.field_type}</span>
                            <b>{f.field_label}</b>
                            {f.required && <span className="text-rose-500 font-bold">*</span>}
                            <button type="button" onClick={() => removeFieldFromSchema(f.id)} className="text-slate-400 hover:text-rose-500 ml-1">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Build Input controllers */}
                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Field Unique Key (lowercase, no spaces)</label>
                        <input
                          type="text"
                          placeholder="e.g., crop_type, farm_size"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Form Label (shown to Agent)</label>
                        <input
                          type="text"
                          placeholder="e.g., Primary Crop Grown, Farm Size"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Field Type</label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as any)}
                          className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="text">Text Input</option>
                          <option value="number">Number</option>
                          <option value="currency">Currency (UGX)</option>
                          <option value="dropdown">Dropdown Options</option>
                          <option value="checkbox">Checkbox toggle</option>
                          <option value="textarea">Textarea Block</option>
                          <option value="date">Date picker</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 mt-3 pt-2">
                        <input
                          type="checkbox"
                          id="chk-req-builder"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                        />
                        <label htmlFor="chk-req-builder" className="text-xs font-semibold text-slate-600">
                          Mark field as REQUIRED *
                        </label>
                      </div>
                    </div>

                    {newFieldType === 'dropdown' && (
                      <div className="mb-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dropdown Choices (comma separated list)</label>
                        <input
                          type="text"
                          placeholder="e.g., Rice, Maize, Beans, Cassava"
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addFieldToSchema}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus size={13} /> Inject Field to Schema Structure
                    </button>
                  </div>

                  {/* Submit row */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateCampModal(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      id="btn-save-campaign-schema"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm"
                    >
                      {loading ? 'Saving Campaign...' : (editingCamp ? 'Update Campaign Config' : 'Create & Activate Draft Campaign')}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* DYNAMIC CAMPAIGN USER ASSIGNMENT TABLE */}
          {(() => {
            const filteredAssignments = assignments.filter(a => {
              const c = campaigns.find(camp => camp.id === a.campaign_id);
              const p = profiles.find(profile => profile.id === a.user_id);
              
              if (assignRegionFilter && a.region_for_campaign !== assignRegionFilter) return false;
              if (assignRoleFilter && a.role_in_campaign !== assignRoleFilter) return false;
              
              if (assignSearch) {
                const s = assignSearch.toLowerCase();
                const userMatch = p?.full_name?.toLowerCase().includes(s) || p?.email?.toLowerCase().includes(s);
                const campaignMatch = c?.name?.toLowerCase().includes(s);
                return userMatch || campaignMatch;
              }
              return true;
            });

            const assignTotalPages = Math.ceil(filteredAssignments.length / assignPerPage) || 1;
            const assignSafePage = Math.min(assignPage, assignTotalPages);
            const paginatedAssignments = filteredAssignments.slice((assignSafePage - 1) * assignPerPage, assignSafePage * assignPerPage);

            return (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Campaign Assignments & Scope Mapping</h3>
                    <p className="text-xs text-slate-500">Assign users to campaigns with campaign-scoped roles and regions.</p>
                  </div>
                  <button
                    id="btn-assign-modal"
                    onClick={() => setShowAssignModal(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition-all shadow-sm"
                  >
                    <Plus size={13} /> Map Assignment
                  </button>
                </div>

                {/* Assignment Search & Filters */}
                <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search assignments..."
                      value={assignSearch}
                      onChange={(e) => {
                        setAssignSearch(e.target.value);
                        setAssignPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    <select
                      value={assignRoleFilter}
                      onChange={(e) => {
                        setAssignRoleFilter(e.target.value);
                        setAssignPage(1);
                      }}
                      className="bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="">All Scoped Roles</option>
                      <option value="regional_manager">Manager</option>
                      <option value="agent">Agent</option>
                    </select>

                    <select
                      value={assignRegionFilter}
                      onChange={(e) => {
                        setAssignRegionFilter(e.target.value);
                        setAssignPage(1);
                      }}
                      className="bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="">All Regions</option>
                      <option value="Central">Central</option>
                      <option value="Eastern">Eastern</option>
                      <option value="Western">Western</option>
                      <option value="Northern">Northern</option>
                    </select>

                    {(assignSearch || assignRegionFilter || assignRoleFilter) && (
                      <button
                        onClick={() => {
                          setAssignSearch('');
                          setAssignRegionFilter('');
                          setAssignRoleFilter('');
                          setAssignPage(1);
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                        <th className="p-3">Campaign</th>
                        <th className="p-3">Workforce Member</th>
                        <th className="p-3">Campaign-Scoped Role</th>
                        <th className="p-3">Assigned Territory</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedAssignments.map(a => {
                        const c = campaigns.find(camp => camp.id === a.campaign_id);
                        const p = profiles.find(profile => profile.id === a.user_id);
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{c ? c.name : 'Unknown Campaign'}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{p ? p.full_name : 'Unknown User'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p ? p.email : ''}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[9px] ${
                                a.role_in_campaign === 'regional_manager' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {a.role_in_campaign}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">{a.region_for_campaign}</td>
                            <td className="p-3">
                              <button
                                onClick={() => removeAssignment(a.id)}
                                className="text-xs font-bold text-rose-500 hover:underline"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedAssignments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                            No assignments match your search or filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Assignments Pagination Controls */}
                {filteredAssignments.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Show</span>
                      <select
                        value={assignPerPage}
                        onChange={(e) => {
                          setAssignPerPage(Number(e.target.value));
                          setAssignPage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-semibold focus:outline-none"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span>entries</span>
                    </div>

                    <div>
                      Showing <span className="font-semibold text-slate-800">{(assignSafePage - 1) * assignPerPage + 1}</span> to{' '}
                      <span className="font-semibold text-slate-800">
                        {Math.min(assignSafePage * assignPerPage, filteredAssignments.length)}
                      </span>{' '}
                      of <span className="font-semibold text-slate-800">{filteredAssignments.length}</span> assignments
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAssignPage(prev => Math.max(prev - 1, 1))}
                        disabled={assignSafePage === 1}
                        className="p-1 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: assignTotalPages }, (_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setAssignPage(i + 1)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold ${
                              assignSafePage === i + 1
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setAssignPage(prev => Math.min(prev + 1, assignTotalPages))}
                        disabled={assignSafePage === assignTotalPages}
                        className="p-1 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Map Assignment Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400">Map Campaign Assignment</h3>
                  <button onClick={() => setShowAssignModal(false)} className="text-slate-300 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Select Campaign</label>
                    <select
                      required
                      value={assignCampaignId}
                      onChange={(e) => setAssignCampaignId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">-- Choose active campaign --</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.client_name})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Select User (Approved Profiles Only)</label>
                    <select
                      required
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">-- Choose workforce profile --</option>
                      {profiles.filter(p => p.status === 'approved').map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.role || 'no-role'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign Specific Role</label>
                      <select
                        value={assignRole}
                        onChange={(e) => setAssignRole(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="agent">Field Agent</option>
                        <option value="regional_manager">Regional Supervisor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Region</label>
                      <select
                        value={assignRegion}
                        onChange={(e) => setAssignRegion(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="Central">Central (Kampala)</option>
                        <option value="Western">Western (Mbarara)</option>
                        <option value="Eastern">Eastern (Jinja)</option>
                        <option value="Northern">Northern (Gulu)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-save-assignment"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm"
                    >
                      Authorize Map
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          </div>
        );
      })()}

      {/* ================= ADMIN TAB: USER SIGNUP APPROVAL SYSTEM ================= */}
      {activeSubTab === 'users' && (() => {
        // Compute filtered pending and active workforce
        const filteredPending = profiles
          .filter(p => p.status === 'pending')
          .filter(p => {
            if (userSearch) {
              const s = userSearch.toLowerCase();
              return (
                p.full_name?.toLowerCase().includes(s) ||
                p.email?.toLowerCase().includes(s) ||
                p.phone_number?.toLowerCase().includes(s) ||
                p.region?.toLowerCase().includes(s)
              );
            }
            return true;
          });

        const filteredWorkforce = profiles
          .filter(p => p.status !== 'pending')
          .filter(p => {
            if (userRoleFilter && p.role !== userRoleFilter) return false;
            if (userStatusFilter && p.status !== userStatusFilter) return false;
            if (userRegionFilter && p.region !== userRegionFilter) return false;
            if (userSearch) {
              const s = userSearch.toLowerCase();
              return (
                p.full_name?.toLowerCase().includes(s) ||
                p.email?.toLowerCase().includes(s) ||
                p.phone_number?.toLowerCase().includes(s) ||
                p.region?.toLowerCase().includes(s)
              );
            }
            return true;
          });

        const userTotalPages = Math.ceil(filteredWorkforce.length / userPerPage) || 1;
        const userSafePage = Math.min(userPage, userTotalPages);
        const paginatedWorkforce = filteredWorkforce.slice((userSafePage - 1) * userPerPage, userSafePage * userPerPage);

        return (
          <div className="space-y-6">
            
            {/* Workforce Directory Search & Filters Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workforce directory by name, email, phone, region..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1); // reset to page 1 on search
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-700"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                  <Filter size={13} />
                  <span>Filters:</span>
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs px-2.5 py-2 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="regional_manager">Manager</option>
                  <option value="agent">Agent</option>
                  <option value="revoked">Revoked / No Role</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs px-2.5 py-2 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={userRegionFilter}
                  onChange={(e) => {
                    setUserRegionFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs px-2.5 py-2 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Regions</option>
                  <option value="Central">Central</option>
                  <option value="Eastern">Eastern</option>
                  <option value="Western">Western</option>
                  <option value="Northern">Northern</option>
                </select>

                {(userSearch || userRoleFilter || userStatusFilter || userRegionFilter) && (
                  <button
                    onClick={() => {
                      setUserSearch('');
                      setUserRoleFilter('');
                      setUserStatusFilter('');
                      setUserRegionFilter('');
                      setUserPage(1);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 transition-all"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* User Signups Section */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-1.5">
                <ShieldAlert className="text-purple-600 animate-pulse" size={18} />
                Onboarding Gatekeeper: Signup Approvals ({filteredPending.length})
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Pending user registrations requiring authentication approvals, requested roles, and regional assignments.
              </p>

              {filteredPending.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-center">
                  All signup requests are cleared or match no filters. Onboarding gatekeeper is in sync.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPending.map(pending => (
                    <div key={pending.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-xl gap-4">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{pending.full_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                          <span>Email: {pending.email}</span>
                          <span>•</span>
                          <span>Phone: {pending.phone_number}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 font-medium">
                          Requested role:{' '}
                          <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase">
                            {pending.requested_role}
                          </span>{' '}
                          for territory region: <span className="font-bold text-slate-700">{pending.region}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => approveUser(pending.id, pending.requested_role, pending.region)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1 shadow-sm"
                        >
                          <Check size={12} /> Approve User
                        </button>
                        <button
                          onClick={() => rejectUser(pending.id)}
                          className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-lg flex items-center gap-1"
                        >
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approved & Rejected Users Directory */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Workforce Profile Directory</h3>
                  <p className="text-xs text-slate-400">Total matched: {filteredWorkforce.length} active directory profiles</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-3">Workforce Member</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Main Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Region</th>
                      <th className="p-3">Override Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedWorkforce.map(dirUser => (
                      <tr key={dirUser.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-850">{dirUser.full_name}</td>
                        <td className="p-3 text-slate-500 font-mono">{dirUser.email}</td>
                        <td className="p-3 uppercase font-mono font-semibold text-[10px]">
                          {dirUser.role || 'no-role'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                            dirUser.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {dirUser.status}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-600">{dirUser.region}</td>
                        <td className="p-3 flex items-center gap-2">
                          <select
                            value={dirUser.role}
                            onChange={(e) => updateUserRoleAndStatus(dirUser.id, e.target.value, dirUser.region, dirUser.status)}
                            className="bg-slate-100 border-none px-2 py-1 text-[10px] rounded font-semibold focus:ring-1 focus:ring-slate-400 cursor-pointer"
                          >
                            <option value="admin">Admin</option>
                            <option value="regional_manager">Manager</option>
                            <option value="agent">Agent</option>
                            <option value="">Revoked</option>
                          </select>
                          <button
                            onClick={() => updateUserRoleAndStatus(dirUser.id, dirUser.role, dirUser.region, dirUser.status === 'approved' ? 'rejected' : 'approved')}
                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                          >
                            {dirUser.status === 'approved' ? 'Deactivate' : 'Activate'}
                          </button>
                          {dirUser.id !== profile.id && (
                            <button
                              onClick={() => deleteUser(dirUser.id, dirUser.full_name)}
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-colors"
                              title="Delete Profile"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {paginatedWorkforce.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          No workforce records matched the selected query or filter constraints.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Workforce Directory Pagination */}
              {filteredWorkforce.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={userPerPage}
                      onChange={(e) => {
                        setUserPerPage(Number(e.target.value));
                        setUserPage(1);
                      }}
                      className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-semibold focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>entries</span>
                  </div>

                  <div>
                    Showing <span className="font-semibold text-slate-800">{(userSafePage - 1) * userPerPage + 1}</span> to{' '}
                    <span className="font-semibold text-slate-800">
                      {Math.min(userSafePage * userPerPage, filteredWorkforce.length)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-800">{filteredWorkforce.length}</span> workforce members
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
                      disabled={userSafePage === 1}
                      className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, userTotalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setUserPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold ${
                              userSafePage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {userTotalPages > 5 && <span className="px-1 py-1 text-slate-400">...</span>}
                    </div>
                    <button
                      onClick={() => setUserPage(prev => Math.min(prev + 1, userTotalPages))}
                      disabled={userSafePage === userTotalPages}
                      className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* ================= ADMIN TAB: KPI TARGET MANAGEMENT ================= */}
      {activeSubTab === 'kpis' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">KPI Target Management</h2>
              <p className="text-xs text-slate-500">Configure operational objectives scoped to campaigns, territories, or specific agents.</p>
            </div>
            <button
              id="btn-create-kpi-modal"
              onClick={() => setShowKpiModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition-all shadow-sm"
            >
              <Plus size={15} /> Establish Target Objective
            </button>
          </div>

          {/* List of active KPI targets */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Operational KPI Registers</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Campaign Context</th>
                    <th className="p-3">Scope Boundary</th>
                    <th className="p-3">Metric KPI Name</th>
                    <th className="p-3">Target Target_Value</th>
                    <th className="p-3">Current Progress</th>
                    <th className="p-3">Progress bar</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpis.map(target => {
                    const c = campaigns.find(camp => camp.id === target.campaign_id);
                    
                    // Dynamically calculate current value based on scope
                    let currentVal = 0;
                    if (target.target_type === 'campaign') {
                      currentVal = submissions.filter(s => s.campaign_id === target.campaign_id).length;
                    } else if (target.target_type === 'region') {
                      currentVal = submissions.filter(s => s.campaign_id === target.campaign_id && s.region === target.target_reference_id).length;
                    } else if (target.target_type === 'agent') {
                      currentVal = submissions.filter(s => s.campaign_id === target.campaign_id && s.agent_id === target.target_reference_id).length;
                    }

                    const pct = Math.min(100, Math.round((currentVal / target.target_value) * 100));

                    let scopeName = "Global Campaign-wide";
                    if (target.target_type === 'region') scopeName = `Territory Region: ${target.target_reference_id}`;
                    if (target.target_type === 'agent') {
                      const agProfile = profiles.find(p => p.id === target.target_reference_id);
                      scopeName = agProfile ? `Agent: ${agProfile.full_name}` : `Agent: ${target.target_reference_id}`;
                    }

                    return (
                      <tr key={target.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{c ? c.name : 'Unknown Campaign'}</td>
                        <td className="p-3 font-semibold text-slate-700">{scopeName}</td>
                        <td className="p-3 font-mono text-indigo-700 uppercase tracking-wide">{target.metric_name}</td>
                        <td className="p-3 font-mono font-bold text-slate-950">{target.target_value}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{currentVal}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => deleteKpi(target.id)}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg"
                            title="Delete Target"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Establish KPI Target Modal */}
          {showKpiModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400">Establish Operational Target</h3>
                  <button onClick={() => setShowKpiModal(false)} className="text-slate-300 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleKpiSubmit} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Target Campaign</label>
                    <select
                      required
                      value={kpiCampaignId}
                      onChange={(e) => setKpiCampaignId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">-- Choose Campaign context --</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Target boundary type</label>
                      <select
                        value={kpiTargetType}
                        onChange={(e) => setKpiTargetType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="campaign">Entire Campaign</option>
                        <option value="region">Region Scope</option>
                        <option value="agent">Agent Scope</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Metric Metric_Name</label>
                      <select
                        value={kpiMetricName}
                        onChange={(e) => setKpiMetricName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="submissions">Submissions</option>
                        <option value="onboarding_count">Onboardings Count</option>
                        <option value="funding_amount">Funding Amount</option>
                        <option value="farmer_registrations">Farmer Registers</option>
                      </select>
                    </div>
                  </div>

                  {kpiTargetType === 'region' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Select Target Region</label>
                      <select
                        value={kpiRefId}
                        onChange={(e) => setKpiRefId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="">-- Choose Region boundary --</option>
                        <option value="Central">Central (Kampala)</option>
                        <option value="Western">Western (Mbarara)</option>
                        <option value="Eastern">Eastern (Jinja)</option>
                        <option value="Northern">Northern (Gulu)</option>
                      </select>
                    </div>
                  )}

                  {kpiTargetType === 'agent' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Select Target Agent</label>
                      <select
                        value={kpiRefId}
                        onChange={(e) => setKpiRefId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="">-- Choose active Agent --</option>
                        {profiles.filter(p => p.role === 'agent').map(ag => (
                          <option key={ag.id} value={ag.id}>{ag.full_name} ({ag.region})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Target Goal Value</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g., 500"
                        value={kpiValue}
                        onChange={(e) => setKpiValue(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={kpiStart}
                          onChange={(e) => setKpiStart(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">End Date</label>
                        <input
                          type="date"
                          value={kpiEnd}
                          onChange={(e) => setKpiEnd(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowKpiModal(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-save-kpi"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm"
                    >
                      Authorize Objective
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= ADMIN TAB: AUDIT LOGS SECURITY LEDGER ================= */}
      {activeSubTab === 'logs' && (() => {
        const filteredLogs = auditLogs.filter(log => {
          if (logActionFilter && !log.action.includes(logActionFilter)) return false;
          if (logSearch) {
            const s = logSearch.toLowerCase();
            return (
              log.user_name?.toLowerCase().includes(s) ||
              log.action?.toLowerCase().includes(s) ||
              log.details?.toLowerCase().includes(s)
            );
          }
          return true;
        });

        const logTotalPages = Math.ceil(filteredLogs.length / logPerPage) || 1;
        const logSafePage = Math.min(logPage, logTotalPages);
        const paginatedLogs = filteredLogs.slice((logSafePage - 1) * logPerPage, logSafePage * logPerPage);

        return (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert size={18} className="text-amber-500" />
              Audit Logging Ledger & Compliance Ledger
            </h2>
            <p className="text-xs text-slate-500">
              A linear historical trace of administrative actions, user approvals, campaign state changes, role delegations, and data downloads in compliance with enterprise audit protocols.
            </p>

            {/* Logs Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs by executor, details, action..."
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <select
                  value={logActionFilter}
                  onChange={(e) => {
                    setLogActionFilter(e.target.value);
                    setLogPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">All Action Types</option>
                  <option value="CREATION">Creations</option>
                  <option value="APPROVAL">Approvals</option>
                  <option value="EXPORT">Exports</option>
                  <option value="UPDATE">Updates</option>
                </select>

                {(logSearch || logActionFilter) && (
                  <button
                    onClick={() => {
                      setLogSearch('');
                      setLogActionFilter('');
                      setLogPage(1);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-1"
                  >
                    Reset
                      </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="p-3">Logged Date</th>
                    <th className="p-3">Executor Identity</th>
                    <th className="p-3">Administrative Action</th>
                    <th className="p-3">Trace Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {paginatedLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{log.user_name}</div>
                        <div className="text-[10px] text-slate-400">{log.user_id}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[10px] ${
                          log.action.includes('CREATION') ? 'bg-emerald-50 text-emerald-700' :
                          log.action.includes('APPROVAL') ? 'bg-purple-50 text-purple-700' :
                          log.action.includes('EXPORT') ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-sans font-medium">{log.details}</td>
                    </tr>
                  ))}
                  {paginatedLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic font-sans">
                        No audit trace logs matched the active query filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Logs Pagination controls */}
            {filteredLogs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={logPerPage}
                    onChange={(e) => {
                      setLogPerPage(Number(e.target.value));
                      setLogPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-semibold focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                  <span>entries</span>
                </div>

                <div>
                  Showing <span className="font-semibold text-slate-800">{(logSafePage - 1) * logPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-slate-800">
                    {Math.min(logSafePage * logPerPage, filteredLogs.length)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-800">{filteredLogs.length}</span> audit logs
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                    disabled={logSafePage === 1}
                    className="p-1 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, logTotalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setLogPage(pageNum)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold ${
                            logSafePage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {logTotalPages > 5 && <span className="px-1 py-1 text-slate-400 font-sans">...</span>}
                  </div>
                  <button
                    onClick={() => setLogPage(prev => Math.min(prev + 1, logTotalPages))}
                    disabled={logSafePage === logTotalPages}
                    className="p-1 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
