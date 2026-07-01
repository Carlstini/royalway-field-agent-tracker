/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, Campaign, Submission, KpiTarget, CampaignAssignment, AuditLog } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import AgentDashboard from './components/AgentDashboard';
import RoyalwayLogo from './components/RoyalwayLogo';
import { Shield, LogOut, Loader2, RefreshCw, Clock, X } from 'lucide-react';
import { isSandboxActive } from './lib/sandboxFetch';

export default function App() {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  
  // Database datasets loaded from server
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [kpis, setKpis] = useState<KpiTarget[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<CampaignAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load profile from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('royalway_user_profile');
    if (savedUser) {
      try {
        setCurrentProfile(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved profile", e);
      }
    }
  }, []);

  // Fetch operational database when user profile changes or when manually refreshed
  const fetchOperationalData = async () => {
    if (!currentProfile) {
      setLoading(false);
      return;
    }

    setRefreshing(true);

    // If sandbox active, read databases from local storage
    if (isSandboxActive()) {
      const readLocalDb = (key: string): any[] => {
        const d = localStorage.getItem(key);
        return d ? JSON.parse(d) : [];
      };

      try {
        const camp = readLocalDb('royalway_local_campaigns');
        const sub = readLocalDb('royalway_local_submissions');
        const kp = readLocalDb('royalway_local_kpis');
        const prof = readLocalDb('royalway_local_profiles');
        const assign = readLocalDb('royalway_local_campaign_assignments');
        const logs = readLocalDb('royalway_local_audit_logs');

        // Apply RLS filtering client-side for non-admin profiles
        if (currentProfile.role === 'admin') {
          setCampaigns(camp);
          setSubmissions(sub);
          setKpis(kp);
          setProfiles(prof);
          setAssignments(assign);
          setAuditLogs(logs);
        } else {
          // Get assignments for this user
          const userAssign = assign.filter((a: any) => a.user_id === currentProfile.id);
          const assignedCampaignIds = userAssign.map((a: any) => a.campaign_id);
          
          // Campaigns
          setCampaigns(camp.filter((c: any) => assignedCampaignIds.includes(c.id)));
          
          // Submissions
          if (currentProfile.role === 'agent') {
            setSubmissions(sub.filter((s: any) => s.agent_id === currentProfile.id && assignedCampaignIds.includes(s.campaign_id)));
          } else if (currentProfile.role === 'regional_manager') {
            setSubmissions(sub.filter((s: any) => {
              const isCampAssigned = assignedCampaignIds.includes(s.campaign_id);
              if (!isCampAssigned) return false;
              const managerRegions = userAssign.filter((a: any) => a.campaign_id === s.campaign_id).map((a: any) => a.region);
              return managerRegions.includes(s.region);
            }));
          } else {
            setSubmissions([]);
          }

          // KPIs
          setKpis(kp.filter((k: any) => {
            const isCampAssigned = assignedCampaignIds.includes(k.campaign_id);
            if (!isCampAssigned) return false;
            if (currentProfile.role === 'regional_manager') {
              const managerRegions = userAssign.filter((a: any) => a.campaign_id === k.campaign_id).map((a: any) => a.region);
              return managerRegions.includes(k.region);
            }
            return k.region === currentProfile.region;
          }));

          setProfiles([]);
          setAssignments(userAssign);
          setAuditLogs([]);
        }
      } catch (err) {
        console.error("Local sandbox read error", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    try {
      // 1. Fetch campaigns (role-scoped via simulated backend RLS)
      const campRes = await fetch('/api/campaigns', {
        headers: { 'X-User-Id': currentProfile.id }
      });
      if (campRes.ok) {
        const d = await campRes.json();
        setCampaigns(d.campaigns);
      }

      // 2. Fetch submissions (role-scoped via simulated backend RLS)
      const subRes = await fetch('/api/submissions', {
        headers: { 'X-User-Id': currentProfile.id }
      });
      if (subRes.ok) {
        const d = await subRes.json();
        setSubmissions(d.submissions);
      }

      // 3. Fetch KPIs (role-scoped via simulated backend RLS)
      const kpisRes = await fetch('/api/kpis', {
        headers: { 'X-User-Id': currentProfile.id }
      });
      if (kpisRes.ok) {
        const d = await kpisRes.json();
        setKpis(d.kpis);
      }

      // 4. Fetch Profiles (Admin only - otherwise blocked via backend RLS)
      const profilesRes = await fetch('/api/admin/users', {
        headers: { 'X-User-Id': currentProfile.id }
      });
      if (profilesRes.ok) {
        const d = await profilesRes.json();
        setProfiles(d.profiles);
      }

      // 5. Fetch Campaign Assignments (Admin/Manager can query - checked via backend RLS)
      if (campaigns.length > 0 || currentProfile.role === 'admin') {
        const campId = campaigns[0]?.id || 'camp-centenary-123';
        const assignRes = await fetch(`/api/campaigns/${campId}/assignments`, {
          headers: { 'X-User-Id': currentProfile.id }
        });
        if (assignRes.ok) {
          const d = await assignRes.json();
          setAssignments(d.assignments);
        }
      }

      // 6. Fetch Audit Logs (Admin only - otherwise blocked via backend RLS)
      const logsRes = await fetch('/api/audit-logs', {
        headers: { 'X-User-Id': currentProfile.id }
      });
      if (logsRes.ok) {
        const d = await logsRes.json();
        setAuditLogs(d.audit_logs);
      }

    } catch (err) {
      console.error("Network synchronization error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch when user switches or when connection restores
  useEffect(() => {
    if (currentProfile) {
      fetchOperationalData();
    } else {
      setLoading(false);
    }
  }, [currentProfile?.id]);

  const handleLoginSuccess = (profile: UserProfile) => {
    setCurrentProfile(profile);
    localStorage.setItem('royalway_user_profile', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    localStorage.removeItem('royalway_user_profile');
    setCampaigns([]);
    setSubmissions([]);
    setKpis([]);
    setProfiles([]);
    setAssignments([]);
    setAuditLogs([]);
  };

  // Switch profiles via the diagnostic Scenario Simulator (RLS bypass simulation)
  const handleProfileSwitch = async (profileId: string) => {
    setLoading(true);
    try {
      // Fetch profile from server to guarantee it's up to date
      const res = await fetch('/api/admin/users'); // Since we switch, let's query profiles or seed profiles
      let foundProfile: UserProfile | undefined;
      
      if (res.ok) {
        const d = await res.json();
        foundProfile = d.profiles.find((p: any) => p.id === profileId);
      } else {
        // Fallback local lookup
        const cachedProfiles = [
          {
            id: "admin-id-123",
            email: "sempalacarlton@gmail.com",
            full_name: "Sempala Carlton",
            phone_number: "+256701123456",
            role: "admin",
            requested_role: "admin",
            status: "approved",
            region: "Central",
            created_at: "2026-06-01"
          },
          {
            id: "manager-id-123",
            email: "manager@royalwaymedia.com",
            full_name: "John Mukasa",
            phone_number: "+256772123456",
            role: "regional_manager",
            requested_role: "regional_manager",
            status: "approved",
            region: "Western",
            created_at: "2026-06-01"
          },
          {
            id: "agent-id-123",
            email: "agent@royalwaymedia.com",
            full_name: "Sarah Namubiru",
            phone_number: "+256782123456",
            role: "agent",
            requested_role: "agent",
            status: "approved",
            region: "Western",
            created_at: "2026-06-01"
          },
          {
            id: "pending-id-123",
            email: "pending@royalwaymedia.com",
            full_name: "David Okello",
            phone_number: "+256752123456",
            role: "",
            requested_role: "agent",
            status: "pending",
            region: "Northern",
            created_at: "2026-06-28"
          }
        ];
        foundProfile = cachedProfiles.find(p => p.id === profileId) as any;
      }

      if (foundProfile) {
        setCurrentProfile(foundProfile);
        localStorage.setItem('royalway_user_profile', JSON.stringify(foundProfile));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineToggle = () => {
    setIsOffline(!isOffline);
  };

  // Add new agent submission locally and re-sync dashboard
  const handleNewSubmission = async (newSub: Submission) => {
    setSubmissions([newSub, ...submissions]);
    await fetchOperationalData(); // sync metrics
  };

  // Local storage queue count (Agent view only)
  const savedQueue = localStorage.getItem(`offline_queue_${currentProfile?.id}`);
  const offlineQueueCount = savedQueue ? JSON.parse(savedQueue).length : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <Loader2 className="animate-spin text-slate-900 mb-3" size={40} />
        <h3 className="font-semibold text-slate-800 text-sm">Synchronizing Operational Pipeline...</h3>
        <p className="text-xs text-slate-500 mt-1">Acquiring security parameters from Cloud Run nodes</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative font-sans">
      
      {/* Universal Top Operational Bar */}
      {currentProfile && (
        <nav className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14">
              <div className="flex items-center gap-3">
                <RoyalwayLogo variant="horizontal" size="sm" inverse={true} />
                <span className="text-[10px] bg-slate-800 border border-slate-700 text-blue-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
                  Uganda MVP Center
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Sandbox active indicator */}
                {isSandboxActive() && (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500 text-amber-950 flex items-center gap-1">
                    📁 SANDBOX DB
                  </span>
                )}

                {/* Connection Badge */}
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isOffline ? 'bg-rose-900 text-rose-300' : 'bg-emerald-900 text-emerald-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                  {isOffline ? 'OFFLINE' : 'ONLINE'}
                </span>

                {/* Sync Refresher button */}
                <button
                  onClick={fetchOperationalData}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="Manual Database Sync"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* User logged in details */}
                <div className="hidden sm:block text-right border-l border-slate-800 pl-4">
                  <div className="text-xs font-semibold text-white leading-tight">{currentProfile.full_name}</div>
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wide leading-none mt-0.5">
                    {currentProfile.role || 'PENDING APPROVAL'}
                  </div>
                </div>

                {/* Log Out */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Dynamic Workspace Router */}
      {!currentProfile ? (
        <Login onLoginSuccess={handleLoginSuccess} isOffline={isOffline} />
      ) : (
        <div className="py-6">
          {currentProfile.status === 'pending' ? (
            <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-slate-100 rounded-2xl shadow-xl text-center">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 animate-pulse">
                <Clock size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Account Pending Verification</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Thank you for registering. Your profile is currently placed under the security Gatekeeper.
                An Administrator must approve your requested role (<b>{currentProfile.requested_role}</b>) and territory region (<b>{currentProfile.region}</b>) before operational dashboard permissions are granted.
              </p>
              
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-left border border-slate-100">
                <div className="text-xs font-semibold text-slate-700">Account Details:</div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  Email: {currentProfile.email}<br />
                  Phone: {currentProfile.phone_number}<br />
                  Registration Time: {new Date(currentProfile.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ) : currentProfile.status === 'rejected' ? (
            <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-slate-150 rounded-2xl shadow-xl text-center">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <X size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Access Request Denied</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Your request to onboard onto the Royalway Media Campaign management operations system has been rejected by administrators.
              </p>
            </div>
          ) : (
            // APPROVED AND ACCESS GRANTED DASHBOARDS (ROLE ROUTED)
            <>
              {currentProfile.role === 'admin' && (
                <AdminDashboard
                  profile={currentProfile}
                  campaigns={campaigns}
                  submissions={submissions}
                  kpis={kpis}
                  profiles={profiles}
                  assignments={assignments}
                  auditLogs={auditLogs}
                  onRefreshData={fetchOperationalData}
                />
              )}

              {currentProfile.role === 'regional_manager' && (
                <ManagerDashboard
                  profile={currentProfile}
                  campaigns={campaigns}
                  submissions={submissions}
                  kpis={kpis}
                  onRefreshData={fetchOperationalData}
                />
              )}

              {currentProfile.role === 'agent' && (
                <AgentDashboard
                  profile={currentProfile}
                  campaigns={campaigns}
                  submissions={submissions}
                  kpis={kpis}
                  isOffline={isOffline}
                  onNewSubmission={handleNewSubmission}
                  onRefreshData={fetchOperationalData}
                />
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
