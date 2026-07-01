/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, Campaign, Submission, KpiTarget, CampaignAssignment, AuditLog } from '../types';

// Helper to determine if sandbox mode is currently active
export function isSandboxActive(): boolean {
  return localStorage.getItem('royalway_sandbox_mode') === 'true';
}

// Enable or disable sandbox mode
export function setSandboxActive(active: boolean) {
  if (active) {
    localStorage.setItem('royalway_sandbox_mode', 'true');
    initializeLocalDb();
  } else {
    localStorage.removeItem('royalway_sandbox_mode');
  }
}

// Initial mock data to seed the Local Sandbox DB
const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: "admin-id-123",
    email: "sempalacarlton@gmail.com",
    full_name: "Sempala Carlton",
    phone_number: "+256701123456",
    role: "admin",
    requested_role: "admin",
    status: "approved",
    region: "Central",
    created_at: "2026-06-01T08:00:00Z"
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
    created_at: "2026-06-01T08:00:00Z"
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
    created_at: "2026-06-01T08:00:00Z"
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
    created_at: "2026-06-28T12:00:00Z"
  }
];

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-centenary-123",
    name: "Centenary Bank Digital Savings Drive",
    client_name: "Centenary Bank Uganda",
    campaign_type: "bank",
    description: "Workforce field activations to drive new digital account registrations via agent banking and CenteMobile in rural and semi-urban communities.",
    status: "active",
    start_date: "2026-06-01",
    end_date: "2026-12-31",
    submission_schema: [
      { id: "customer_name", field_name: "customer_name", field_label: "Customer Full Name", field_type: "text", required: true, visible: true },
      { id: "national_id", field_name: "national_id", field_label: "NIN (National ID Number)", field_type: "text", required: true, visible: true },
      { id: "phone_number", field_name: "phone_number", field_label: "Mobile Number", field_type: "text", required: true, visible: true },
      { id: "initial_deposit", field_name: "initial_deposit", field_label: "Initial Deposit (UGX)", field_type: "number", required: true, visible: true },
      { id: "activation_notes", field_name: "activation_notes", field_label: "Activation Notes/Feedback", field_type: "textarea", required: false, visible: true }
    ],
    created_by: "admin-id-123",
    created_at: "2026-06-01T08:00:00Z",
    updated_at: "2026-06-01T08:00:00Z"
  },
  {
    id: "camp-momo-123",
    name: "MTN MoMo Merchant Recruitment",
    client_name: "MTN Mobile Money Uganda",
    campaign_type: "telecom",
    description: "Onboarding local retail kiosks, shops, and market vendors in Central and Western regions onto the MoMo Pay merchant ecosystem.",
    status: "active",
    start_date: "2026-06-15",
    end_date: "2026-10-15",
    submission_schema: [
      { id: "business_name", field_name: "business_name", field_label: "Business/Trade Name", field_type: "text", required: true, visible: true },
      { id: "owner_name", field_name: "owner_name", field_label: "Owner Full Name", field_type: "text", required: true, visible: true },
      { id: "momo_number", field_name: "momo_number", field_label: "Proposed Merchant SIM Number", field_type: "text", required: true, visible: true },
      { id: "business_type", field_name: "business_type", field_label: "Line of Business", field_type: "text", required: true, visible: true }
    ],
    created_by: "admin-id-123",
    created_at: "2026-06-15T09:00:00Z",
    updated_at: "2026-06-15T09:00:00Z"
  }
];

const DEFAULT_ASSIGNMENTS: CampaignAssignment[] = [
  {
    id: "assign-1",
    campaign_id: "camp-centenary-123",
    user_id: "agent-id-123",
    role_in_campaign: "agent",
    region_for_campaign: "Western",
    assigned_by: "admin-id-123",
    created_at: "2026-06-02T10:00:00Z"
  },
  {
    id: "assign-2",
    campaign_id: "camp-centenary-123",
    user_id: "manager-id-123",
    role_in_campaign: "regional_manager",
    region_for_campaign: "Western",
    assigned_by: "admin-id-123",
    created_at: "2026-06-02T10:00:00Z"
  },
  {
    id: "assign-3",
    campaign_id: "camp-momo-123",
    user_id: "manager-id-123",
    role_in_campaign: "regional_manager",
    region_for_campaign: "Western",
    assigned_by: "admin-id-123",
    created_at: "2026-06-16T11:00:00Z"
  }
];

const DEFAULT_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    campaign_id: "camp-centenary-123",
    agent_id: "agent-id-123",
    full_name: "Emmanuel Ssewankambo",
    phone_number: "+256772998877",
    national_id: "CM95018237HGFA",
    gender: "Male",
    gps_latitude: 0.3476,
    gps_longitude: 32.5825,
    region: "Western",
    segment_type: "Retailer",
    dynamic_data: {
      customer_name: "Emmanuel Ssewankambo",
      national_id: "CM95018237HGFA",
      phone_number: "+256772998877",
      initial_deposit: "25000",
      activation_notes: "Very receptive client, registered on CenteMobile successfully."
    },
    created_at: "2026-06-25T14:30:00Z",
    synced_status: "synced"
  },
  {
    id: "sub-2",
    campaign_id: "camp-centenary-123",
    agent_id: "agent-id-123",
    full_name: "Allen Kemigisha",
    phone_number: "+256701223344",
    national_id: "CF98027164KJH7",
    gender: "Female",
    gps_latitude: -0.6072,
    gps_longitude: 30.6545,
    region: "Western",
    segment_type: "Retailer",
    dynamic_data: {
      customer_name: "Allen Kemigisha",
      national_id: "CF98027164KJH7",
      phone_number: "+256701223344",
      initial_deposit: "10000",
      activation_notes: "Opened account, needs follow up for activation SMS."
    },
    created_at: "2026-06-29T11:15:00Z",
    synced_status: "pending"
  }
];

const DEFAULT_KPIS: KpiTarget[] = [
  {
    id: "kpi-1",
    campaign_id: "camp-centenary-123",
    target_type: "region",
    target_reference_id: "Western",
    metric_name: "submissions",
    target_value: 150,
    start_date: "2026-06-01",
    end_date: "2026-09-30",
    created_by: "admin-id-123",
    created_at: "2026-06-03T12:00:00Z"
  },
  {
    id: "kpi-2",
    campaign_id: "camp-momo-123",
    target_type: "region",
    target_reference_id: "Western",
    metric_name: "submissions",
    target_value: 200,
    start_date: "2026-06-15",
    end_date: "2026-08-31",
    created_by: "admin-id-123",
    created_at: "2026-06-17T13:00:00Z"
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    user_id: "admin-id-123",
    user_name: "Sempala Carlton",
    action: "SYSTEM_INITIALIZATION",
    details: "Royalway Campaign Manager sandbox platform activated completely client-side.",
    created_at: "2026-07-01T08:00:00Z"
  }
];

// Initialize mock DB in LocalStorage if keys are absent
export function initializeLocalDb(forceReset = false) {
  const checkAndSet = (key: string, defaultData: any) => {
    if (forceReset || !localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultData));
    }
  };

  checkAndSet('royalway_local_profiles', DEFAULT_PROFILES);
  checkAndSet('royalway_local_campaigns', DEFAULT_CAMPAIGNS);
  checkAndSet('royalway_local_campaign_assignments', DEFAULT_ASSIGNMENTS);
  checkAndSet('royalway_local_submissions', DEFAULT_SUBMISSIONS);
  checkAndSet('royalway_local_kpis', DEFAULT_KPIS);
  checkAndSet('royalway_local_audit_logs', DEFAULT_AUDIT_LOGS);
}

// Overwrite window.fetch with local storage routers
export function setupSandboxFetch() {
  const originalFetch = window.fetch ? window.fetch.bind(window) : null;

  const sandboxFetchHandler = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = input.toString();

    // Only intercept requests directed to our back-end API routes
    if (!urlStr.includes('/api/') || !isSandboxActive()) {
      if (originalFetch) {
        return originalFetch(input, init);
      }
      return new Response(JSON.stringify({ error: "Original fetch is not available." }), { status: 500 });
    }

    // Helper to extract JSON request body
    let bodyObj: any = {};
    if (init && init.body) {
      try {
        bodyObj = JSON.parse(init.body.toString());
      } catch (e) {
        // Body is not JSON
      }
    }

    // Helper to extract the authenticated user from the X-User-Id header
    const userIdHeader = init?.headers ? (init.headers as any)['X-User-Id'] : null;

    // Local DB readers & writers
    const readLocalDb = (key: string): any[] => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    };

    const writeLocalDb = (key: string, data: any[]) => {
      localStorage.setItem(key, JSON.stringify(data));
    };

    const getAuthUserLocal = (): UserProfile | null => {
      if (!userIdHeader) return null;
      const profiles = readLocalDb('royalway_local_profiles');
      return profiles.find(p => p.id === userIdHeader) || null;
    };

    const addLocalAuditLog = (userId: string, userName: string, action: string, details: string) => {
      const logs = readLocalDb('royalway_local_audit_logs');
      const newLog: AuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        user_id: userId,
        user_name: userName,
        action,
        details,
        created_at: new Date().toISOString()
      };
      logs.unshift(newLog);
      writeLocalDb('royalway_local_audit_logs', logs);
    };

    // Helper function to bundle a response
    const jsonResponse = (data: any, status = 200): Response => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    // Parse path parameters and queries
    const url = new URL(urlStr, window.location.origin);
    const pathname = url.pathname;
    const method = init?.method?.toUpperCase() || 'GET';

    console.log(`[Sandbox Fetch Intercept] ${method} ${pathname}`, bodyObj);

    // 1. LOGIN & SIGNUP
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = bodyObj;
      const profiles = readLocalDb('royalway_local_profiles');
      const user = profiles.find(p => p.email.toLowerCase() === email?.trim()?.toLowerCase());
      
      if (!user) {
        return jsonResponse({ error: "No registered profile found matching this email." }, 404);
      }

      if (user.status === 'pending') {
        return jsonResponse({ error: "Access pending admin approval. Regional manager will notify you once activated." }, 403);
      }

      if (user.status === 'rejected') {
        return jsonResponse({ error: "Access denied: Your account activation proposal was rejected by admin." }, 403);
      }

      // In Sandbox mode, we permit login bypass (or accept any password) for convenience
      return jsonResponse({ profile: user }, 200);
    }

    if (pathname === '/api/auth/signup' && method === 'POST') {
      const { email, full_name, phone_number, requested_role, region } = bodyObj;
      if (!email || !full_name) {
        return jsonResponse({ error: "Email and full name are required." }, 400);
      }

      const profiles = readLocalDb('royalway_local_profiles');
      const existing = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return jsonResponse({ error: "A user with this email already exists." }, 400);
      }

      const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newProfile: UserProfile = {
        id: newUserId,
        email: email.toLowerCase(),
        full_name,
        phone_number: phone_number || "",
        role: "", // pending approval
        requested_role: requested_role || "agent",
        status: "pending",
        region: region || "Central",
        created_at: new Date().toISOString()
      };

      profiles.push(newProfile);
      writeLocalDb('royalway_local_profiles', profiles);

      // Audit log
      addLocalAuditLog(newUserId, full_name, "ACCOUNT_SIGNUP", `Proposed signup for region ${region} with requested role: ${requested_role}`);

      return jsonResponse({ message: "Registration proposed. Awaiting administrator approval.", profile: newProfile }, 200);
    }

    if (pathname === '/api/auth/current' && method === 'GET') {
      const user = getAuthUserLocal();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      return jsonResponse({ profile: user }, 200);
    }

    // 2. ADMIN USER MANAGEMENT
    if (pathname === '/api/admin/users' && method === 'GET') {
      const user = getAuthUserLocal();
      if (!user || user.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);
      const profiles = readLocalDb('royalway_local_profiles');
      return jsonResponse({ profiles }, 200);
    }

    const approveMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/approve$/);
    if (approveMatch && method === 'POST') {
      const admin = getAuthUserLocal();
      if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);
      
      const targetId = approveMatch[1];
      const profiles = readLocalDb('royalway_local_profiles');
      const idx = profiles.findIndex(p => p.id === targetId);
      
      if (idx !== -1) {
        profiles[idx].status = 'approved';
        profiles[idx].role = profiles[idx].requested_role || 'agent';
        writeLocalDb('royalway_local_profiles', profiles);
        
        addLocalAuditLog(admin.id, admin.full_name, "USER_APPROVAL", `Approved workspace access for '${profiles[idx].full_name}' as '${profiles[idx].role}'`);
        return jsonResponse({ message: "User approved", profile: profiles[idx] });
      }
      return jsonResponse({ error: "User not found" }, 404);
    }

    const rejectMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/reject$/);
    if (rejectMatch && method === 'POST') {
      const admin = getAuthUserLocal();
      if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);
      
      const targetId = rejectMatch[1];
      const profiles = readLocalDb('royalway_local_profiles');
      const idx = profiles.findIndex(p => p.id === targetId);
      
      if (idx !== -1) {
        profiles[idx].status = 'rejected';
        profiles[idx].role = '';
        writeLocalDb('royalway_local_profiles', profiles);
        
        addLocalAuditLog(admin.id, admin.full_name, "USER_REJECTION", `Rejected workspace access for '${profiles[idx].full_name}'`);
        return jsonResponse({ message: "User rejected", profile: profiles[idx] });
      }
      return jsonResponse({ error: "User not found" }, 404);
    }

    const updateMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/update$/);
    if (updateMatch && method === 'POST') {
      const admin = getAuthUserLocal();
      if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);
      
      const targetId = updateMatch[1];
      const { role, region } = bodyObj;
      const profiles = readLocalDb('royalway_local_profiles');
      const idx = profiles.findIndex(p => p.id === targetId);
      
      if (idx !== -1) {
        profiles[idx].role = role;
        profiles[idx].region = region;
        writeLocalDb('royalway_local_profiles', profiles);
        
        addLocalAuditLog(admin.id, admin.full_name, "USER_UPDATE", `Updated role/region for user '${profiles[idx].full_name}'`);
        return jsonResponse({ message: "User updated", profile: profiles[idx] });
      }
      return jsonResponse({ error: "User not found" }, 404);
    }

    const deleteUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteUserMatch && method === 'DELETE') {
      const admin = getAuthUserLocal();
      if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);
      
      const targetId = deleteUserMatch[1];
      const profiles = readLocalDb('royalway_local_profiles');
      const idx = profiles.findIndex(p => p.id === targetId);
      
      if (idx !== -1) {
        const deleted = profiles[idx];
        profiles.splice(idx, 1);
        writeLocalDb('royalway_local_profiles', profiles);

        // Delete assignments too
        let assigns = readLocalDb('royalway_local_campaign_assignments');
        assigns = assigns.filter(a => a.user_id !== targetId);
        writeLocalDb('royalway_local_campaign_assignments', assigns);
        
        addLocalAuditLog(admin.id, admin.full_name, "USER_DELETION", `Deleted workspace profile '${deleted.full_name}'`);
        return jsonResponse({ message: "User deleted" });
      }
      return jsonResponse({ error: "User not found" }, 404);
    }

    // 3. CAMPAIGNS
    if (pathname === '/api/campaigns' && method === 'GET') {
      const user = getAuthUserLocal();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      
      const campaigns = readLocalDb('royalway_local_campaigns');
      if (user.role === 'admin') {
        return jsonResponse({ campaigns }, 200);
      }

      // Filter based on user assignments
      const assignments = readLocalDb('royalway_local_campaign_assignments');
      const userCampaignIds = assignments.filter(a => a.user_id === user.id).map(a => a.campaign_id);
      const filtered = campaigns.filter(c => userCampaignIds.includes(c.id));
      return jsonResponse({ campaigns: filtered }, 200);
    }

    if (pathname === '/api/campaigns' && method === 'POST') {
      const admin = getAuthUserLocal();
      if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

      const campaigns = readLocalDb('royalway_local_campaigns');
      const newCamp: Campaign = {
        id: `camp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: bodyObj.name,
        client_name: bodyObj.client_name,
        campaign_type: bodyObj.campaign_type || "bank",
        description: bodyObj.description || "",
        status: "active",
        start_date: bodyObj.start_date || "",
        end_date: bodyObj.end_date || "",
        submission_schema: bodyObj.submission_schema || [],
        created_by: admin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      campaigns.push(newCamp);
      writeLocalDb('royalway_local_campaigns', campaigns);

      addLocalAuditLog(admin.id, admin.full_name, "CAMPAIGN_CREATION", `Created campaign '${newCamp.name}' for client '${newCamp.client_name}'`);
      return jsonResponse({ message: "Campaign created successfully", campaign: newCamp }, 200);
    }

    const campaignIdMatch = pathname.match(/^\/api\/campaigns\/([^/]+)$/);
    if (campaignIdMatch) {
      const campId = campaignIdMatch[1];
      const campaigns = readLocalDb('royalway_local_campaigns');
      const idx = campaigns.findIndex(c => c.id === campId);

      if (idx === -1) {
        return jsonResponse({ error: "Campaign not found" }, 404);
      }

      if (method === 'PUT') {
        const admin = getAuthUserLocal();
        if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

        campaigns[idx] = { ...campaigns[idx], ...bodyObj };
        writeLocalDb('royalway_local_campaigns', campaigns);

        addLocalAuditLog(admin.id, admin.full_name, "CAMPAIGN_UPDATE", `Updated campaign settings for '${campaigns[idx].name}'`);
        return jsonResponse({ message: "Campaign updated successfully", campaign: campaigns[idx] }, 200);
      }

      if (method === 'DELETE') {
        const admin = getAuthUserLocal();
        if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

        const deleted = campaigns[idx];
        campaigns.splice(idx, 1);
        writeLocalDb('royalway_local_campaigns', campaigns);

        // Delete assignments too
        let assigns = readLocalDb('royalway_local_campaign_assignments');
        assigns = assigns.filter(a => a.campaign_id !== campId);
        writeLocalDb('royalway_local_campaign_assignments', assigns);

        addLocalAuditLog(admin.id, admin.full_name, "CAMPAIGN_DELETION", `Deleted campaign '${deleted.name}'`);
        return jsonResponse({ message: "Campaign deleted successfully" }, 200);
      }
    }

    // 4. CAMPAIGN ASSIGNMENTS
    const assignmentsMatch = pathname.match(/^\/api\/campaigns\/([^/]+)\/assignments$/);
    if (assignmentsMatch) {
      const campId = assignmentsMatch[1];
      if (method === 'GET') {
        const assignments = readLocalDb('royalway_local_campaign_assignments');
        const filtered = assignments.filter(a => a.campaign_id === campId);
        return jsonResponse({ assignments: filtered }, 200);
      }

      if (method === 'POST') {
        const admin = getAuthUserLocal();
        if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

        const { user_id, region } = bodyObj;
        const profiles = readLocalDb('royalway_local_profiles');
        const campaigns = readLocalDb('royalway_local_campaigns');
        
        const targetUser = profiles.find(p => p.id === user_id);
        const campaign = campaigns.find(c => c.id === campId);

        if (!targetUser || !campaign) {
          return jsonResponse({ error: "User or Campaign not found." }, 400);
        }

        const assignments = readLocalDb('royalway_local_campaign_assignments');
        
        // Prevent duplicates
        const exists = assignments.find(a => a.campaign_id === campId && a.user_id === user_id && (a.region_for_campaign === region || a.region === region));
        if (exists) {
          return jsonResponse({ error: "This workforce member is already assigned to this campaign region." }, 400);
        }

        const newAssign: CampaignAssignment = {
          id: `assign-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          campaign_id: campId,
          user_id,
          role_in_campaign: targetUser.requested_role === 'regional_manager' ? 'regional_manager' : 'agent',
          region_for_campaign: region,
          assigned_by: admin.id,
          created_at: new Date().toISOString()
        };

        assignments.push(newAssign);
        writeLocalDb('royalway_local_campaign_assignments', assignments);

        addLocalAuditLog(admin.id, admin.full_name, "CAMPAIGN_ASSIGNMENT", `Assigned '${targetUser.full_name}' to campaign '${campaign.name}' in region '${region}'`);
        return jsonResponse({ message: "User assigned successfully", assignment: newAssign }, 200);
      }
    }

    const deleteAssignMatch = pathname.match(/^\/api\/campaign-assignments\/([^/]+)$/);
    if (deleteAssignMatch && method === 'DELETE') {
      const admin = getAuthUserLocal();
      if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

      const assignId = deleteAssignMatch[1];
      const assignments = readLocalDb('royalway_local_campaign_assignments');
      const idx = assignments.findIndex(a => a.id === assignId);

      if (idx !== -1) {
        const deleted = assignments[idx];
        assignments.splice(idx, 1);
        writeLocalDb('royalway_local_campaign_assignments', assignments);

        addLocalAuditLog(admin.id, admin.full_name, "CAMPAIGN_ASSIGNMENT_REMOVAL", `Removed assignment in region '${deleted.region_for_campaign || deleted.region}' for campaign id ${deleted.campaign_id}`);
        return jsonResponse({ message: "Assignment removed successfully" });
      }
      return jsonResponse({ error: "Assignment not found" }, 404);
    }

    // 5. SUBMISSIONS
    if (pathname === '/api/submissions' && method === 'GET') {
      const user = getAuthUserLocal();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

      const submissions = readLocalDb('royalway_local_submissions');
      if (user.role === 'admin') {
        return jsonResponse({ submissions }, 200);
      }

      const assignments = readLocalDb('royalway_local_campaign_assignments');
      const assignedCampaignIds = assignments.filter(a => a.user_id === user.id).map(a => a.campaign_id);

      if (user.role === 'agent') {
        const filtered = submissions.filter(s => s.agent_id === user.id && assignedCampaignIds.includes(s.campaign_id));
        return jsonResponse({ submissions: filtered }, 200);
      }

      if (user.role === 'regional_manager') {
        const filtered = submissions.filter(s => {
          const isCampAssigned = assignedCampaignIds.includes(s.campaign_id);
          if (!isCampAssigned) return false;
          // Check region matches manager's assignment regions
          const managerRegions = assignments.filter(a => a.user_id === user.id && a.campaign_id === s.campaign_id).map(a => a.region_for_campaign || a.region);
          return managerRegions.includes(s.region);
        });
        return jsonResponse({ submissions: filtered }, 200);
      }

      return jsonResponse({ submissions: [] }, 200);
    }

    if (pathname === '/api/submissions' && method === 'POST') {
      const user = getAuthUserLocal();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

      const { campaign_id, region, submission_data, gps_latitude, gps_longitude } = bodyObj;
      const campaigns = readLocalDb('royalway_local_campaigns');
      const campaign = campaigns.find(c => c.id === campaign_id);

      if (!campaign) {
        return jsonResponse({ error: "Campaign not found" }, 404);
      }

      const submissions = readLocalDb('royalway_local_submissions');
      const newSub: Submission = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        campaign_id,
        agent_id: user.id,
        full_name: submission_data.customer_name || submission_data.full_name || "Unknown Customer",
        phone_number: submission_data.phone_number || "+256000000000",
        national_id: submission_data.national_id || "",
        gender: submission_data.gender || "Male",
        gps_latitude: gps_latitude || 0.3476,
        gps_longitude: gps_longitude || 32.5825,
        region: region || user.region || "Central",
        segment_type: submission_data.segment_type || "Retailer",
        dynamic_data: submission_data,
        created_at: new Date().toISOString(),
        synced_status: "synced"
      };

      submissions.unshift(newSub);
      writeLocalDb('royalway_local_submissions', submissions);

      addLocalAuditLog(user.id, user.full_name, "SUBMISSION_CREATION", `Submitted record under campaign '${campaign.name}' in region '${newSub.region}'`);
      return jsonResponse({ message: "Submission captured successfully.", submission: newSub }, 200);
    }

    if (pathname === '/api/submissions/bulk' && method === 'POST') {
      const user = getAuthUserLocal();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

      const { submissions: incomingSubmissions } = bodyObj;
      if (!Array.isArray(incomingSubmissions)) {
        return jsonResponse({ error: "Submissions array required" }, 400);
      }

      const submissions = readLocalDb('royalway_local_submissions');
      const campaigns = readLocalDb('royalway_local_campaigns');

      const added: Submission[] = [];
      for (const item of incomingSubmissions) {
        const campaign = campaigns.find(c => c.id === item.campaign_id);
        const itemData = item.dynamic_data || item.submission_data || {};
        const newSub: Submission = {
          id: item.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          campaign_id: item.campaign_id,
          agent_id: user.id,
          full_name: item.full_name || itemData.customer_name || "Unknown Customer",
          phone_number: item.phone_number || itemData.phone_number || "+256000000000",
          national_id: item.national_id || itemData.national_id || "",
          gender: item.gender || "Male",
          gps_latitude: item.gps_latitude || 0.3476,
          gps_longitude: item.gps_longitude || 32.5825,
          region: item.region || user.region || "Central",
          segment_type: item.segment_type || "Retailer",
          dynamic_data: itemData,
          created_at: item.created_at || item.submitted_at || new Date().toISOString(),
          synced_status: "synced"
        };
        submissions.unshift(newSub);
        added.push(newSub);
      }

      writeLocalDb('royalway_local_submissions', submissions);
      addLocalAuditLog(user.id, user.full_name, "BULK_SUBMISSION_SYNC", `Synchronized ${added.length} offline-queued submissions`);

      return jsonResponse({ success: true, count: added.length }, 200);
    }

    const deleteSubMatch = pathname.match(/^\/api\/submissions\/([^/]+)$/);
    if (deleteSubMatch && method === 'DELETE') {
      const user = getAuthUserLocal();
      if (!user || user.role !== 'admin') return jsonResponse({ error: "Forbidden: Admin only." }, 403);

      const subId = deleteSubMatch[1];
      const submissions = readLocalDb('royalway_local_submissions');
      const idx = submissions.findIndex(s => s.id === subId);

      if (idx !== -1) {
        submissions.splice(idx, 1);
        writeLocalDb('royalway_local_submissions', submissions);
        return jsonResponse({ message: "Submission removed" });
      }
      return jsonResponse({ error: "Submission not found" }, 404);
    }

    // 6. KPIS
    if (pathname === '/api/kpis' && method === 'GET') {
      const user = getAuthUserLocal();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

      const kpis = readLocalDb('royalway_local_kpis');
      if (user.role === 'admin') {
        return jsonResponse({ kpis }, 200);
      }

      const assignments = readLocalDb('royalway_local_campaign_assignments');
      const assignedCampaignIds = assignments.filter(a => a.user_id === user.id).map(a => a.campaign_id);
      
      // Filter by manager assigned region/campaigns
      const filtered = kpis.filter(k => {
        const isCampAssigned = assignedCampaignIds.includes(k.campaign_id);
        if (!isCampAssigned) return false;
        if (user.role === 'regional_manager') {
          const managerRegions = assignments.filter(a => a.user_id === user.id && a.campaign_id === k.campaign_id).map(a => a.region_for_campaign || a.region);
          return managerRegions.includes(k.target_reference_id);
        }
        return k.target_reference_id === user.region;
      });

      return jsonResponse({ kpis: filtered }, 200);
    }

    if (pathname === '/api/kpis' && method === 'POST') {
      const admin = getAuthUserLocal();
      if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

      const kpis = readLocalDb('royalway_local_kpis');
      const campaigns = readLocalDb('royalway_local_campaigns');
      const campaign = campaigns.find(c => c.id === bodyObj.campaign_id);

      if (!campaign) {
        return jsonResponse({ error: "Campaign not found" }, 404);
      }

      const newKpi: KpiTarget = {
        id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        campaign_id: bodyObj.campaign_id,
        target_type: bodyObj.target_type || "region",
        target_reference_id: bodyObj.target_reference_id || bodyObj.region || "Central",
        metric_name: bodyObj.metric_name || "submissions",
        target_value: parseInt(bodyObj.target_value || bodyObj.target_submissions) || 100,
        start_date: bodyObj.start_date || new Date().toISOString().split('T')[0],
        end_date: bodyObj.end_date || bodyObj.deadline || "",
        created_by: admin.id,
        created_at: new Date().toISOString()
      };

      kpis.push(newKpi);
      writeLocalDb('royalway_local_kpis', kpis);

      addLocalAuditLog(admin.id, admin.full_name, "KPI_CREATION", `Defined target of ${newKpi.target_value} for campaign id '${newKpi.campaign_id}' for '${newKpi.target_reference_id}'`);
      return jsonResponse({ message: "KPI target created", kpi: newKpi }, 200);
    }

    const kpiMatch = pathname.match(/^\/api\/kpis\/([^/]+)$/);
    if (kpiMatch) {
      const kpiId = kpiMatch[1];
      const kpis = readLocalDb('royalway_local_kpis');
      const idx = kpis.findIndex(k => k.id === kpiId);

      if (idx === -1) {
        return jsonResponse({ error: "KPI target not found" }, 404);
      }

      if (method === 'PUT') {
        const admin = getAuthUserLocal();
        if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

        kpis[idx] = { ...kpis[idx], ...bodyObj };
        writeLocalDb('royalway_local_kpis', kpis);

        addLocalAuditLog(admin.id, admin.full_name, "KPI_UPDATE", `Updated KPI target under campaign id '${kpis[idx].campaign_id}' for '${kpis[idx].target_reference_id}'`);
        return jsonResponse({ message: "KPI updated successfully", kpi: kpis[idx] }, 200);
      }

      if (method === 'DELETE') {
        const admin = getAuthUserLocal();
        if (!admin || admin.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);

        const deleted = kpis[idx];
        kpis.splice(idx, 1);
        writeLocalDb('royalway_local_kpis', kpis);

        addLocalAuditLog(admin.id, admin.full_name, "KPI_DELETION", `Deleted KPI target under campaign id '${deleted.campaign_id}'`);
        return jsonResponse({ message: "KPI target deleted successfully" }, 200);
      }
    }

    // 7. AUDIT LOGS
    if (pathname === '/api/audit-logs' && method === 'GET') {
      const user = getAuthUserLocal();
      if (!user || user.role !== 'admin') return jsonResponse({ error: "Forbidden" }, 403);
      const logs = readLocalDb('royalway_local_audit_logs');
      return jsonResponse({ audit_logs: logs }, 200);
    }

    if (pathname === '/api/audit-logs' && method === 'POST') {
      const user = getAuthUserLocal();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      const { action, details } = bodyObj;
      addLocalAuditLog(user.id, user.full_name, action, details);
      return jsonResponse({ success: true }, 200);
    }

    // 8. TEST SEED
    if (pathname === '/api/test/seed' && method === 'POST') {
      initializeLocalDb(true);
      return jsonResponse({ message: "Database re-seeded successfully." }, 200);
    }

    // Default 404 for unhandled sandbox paths
    return jsonResponse({ error: "Mock endpoint not found" }, 404);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: sandboxFetchHandler,
      configurable: true,
      writable: true
    });
  } catch (e) {
    try {
      (window as any).fetch = sandboxFetchHandler;
    } catch (err) {
      console.error("Could not override window.fetch:", err);
    }
  }
}
