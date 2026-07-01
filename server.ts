/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { 
  UserProfile, 
  Campaign, 
  CampaignAssignment, 
  Submission, 
  KpiTarget, 
  AuditLog 
} from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Cryptography helpers for real email+password auth
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

function sanitizeProfile(profile: any) {
  if (!profile) return null;
  const { password_hash, password_salt, ...cleanProfile } = profile;
  return cleanProfile;
}

// Helper to load/save DB
const DB_PATH = path.resolve(process.cwd(), 'src', 'db_store.json');

function readDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      
      // Auto-migrate pre-seeded users without passwords so they can use the passcode 'royalway123'
      let modified = false;
      if (parsed && Array.isArray(parsed.profiles)) {
        parsed.profiles.forEach((profile: any) => {
          if (!profile.password_hash || !profile.password_salt) {
            const { hash, salt } = hashPassword('royalway123');
            profile.password_hash = hash;
            profile.password_salt = salt;
            modified = true;
          }
        });
      }
      
      if (modified) {
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      
      return parsed;
    }
  } catch (err) {
    console.error("Error reading database file", err);
  }
  // Fallback default
  return {
    profiles: [],
    campaigns: [],
    campaign_assignments: [],
    submissions: [],
    kpi_targets: [],
    audit_logs: []
  };
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// Middleware to get authenticated user from X-User-Id header (Simulated RLS)
function getAuthUser(req: express.Request): UserProfile | null {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return null;
  const db = readDb();
  return db.profiles.find((p: any) => p.id === userId) || null;
}

// Helper to log audit logs
function logAction(userId: string, userName: string, action: string, details: string) {
  const db = readDb();
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    user_name: userName,
    action,
    details,
    created_at: new Date().toISOString()
  };
  db.audit_logs.unshift(newLog);
  writeDb(db);
}

// ================= AUTH ENDPOINTS =================

// Signup endpoint
app.post("/api/auth/signup", (req, res) => {
  const { email, full_name, phone_number, requested_role, region, password } = req.body;
  if (!email || !full_name || !password) {
    return res.status(400).json({ error: "Email, full name, and password are required." });
  }

  const db = readDb();
  const existing = db.profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  const { hash, salt } = hashPassword(password);

  const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const newProfile: UserProfile = {
    id: newUserId,
    email: email.toLowerCase(),
    full_name,
    phone_number: phone_number || "",
    role: "", // pending status means empty role
    requested_role: requested_role || "agent",
    status: "pending",
    region: region || "Central",
    created_at: new Date().toISOString(),
    password_hash: hash,
    password_salt: salt
  };

  db.profiles.push(newProfile);
  writeDb(db);

  logAction(newUserId, full_name, "USER_SIGNUP", `Requested role '${requested_role}' for region '${region || "Central"}'`);

  res.json({ message: "Signup successful, account pending approval.", profile: sanitizeProfile(newProfile) });
});

// Login endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const profile = db.profiles.find((p: any) => p.email.toLowerCase() === email.trim().toLowerCase());
  
  if (!profile) {
    return res.status(401).json({ error: "User profile not found. Please sign up." });
  }

  if (!profile.password_hash || !profile.password_salt) {
    return res.status(401).json({ error: "This profile does not have a passcode set." });
  }

  if (!verifyPassword(password, profile.password_hash, profile.password_salt)) {
    return res.status(401).json({ error: "Incorrect passcode. Please try again." });
  }

  if (profile.status === "pending") {
    return res.status(403).json({ error: "Your account is pending admin approval. Please wait for an administrator to approve." });
  }

  if (profile.status === "rejected") {
    return res.status(403).json({ error: "Your account request has been rejected. Please contact support." });
  }

  res.json({ message: "Login successful.", profile: sanitizeProfile(profile) });
});

// Current User profile endpoint
app.get("/api/auth/current", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ profile: sanitizeProfile(user) });
});


// ================= ADMIN USER MANAGEMENT =================

// Get all users
app.get("/api/admin/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }
  const db = readDb();
  res.json({ profiles: db.profiles.map(sanitizeProfile) });
});

// Approve/Reject User
app.post("/api/admin/users/:id/approve", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const { role, region } = req.body; // option to override role/region during approval

  const db = readDb();
  const profile = db.profiles.find((p: any) => p.id === id);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found." });
  }

  const oldStatus = profile.status;
  profile.status = "approved";
  profile.role = role || profile.requested_role || "agent";
  if (region) {
    profile.region = region;
  }

  writeDb(db);
  logAction(admin.id, admin.full_name, "USER_APPROVAL", `Approved '${profile.full_name}' as '${profile.role}' in region '${profile.region}'`);

  res.json({ message: "User approved successfully.", profile });
});

app.post("/api/admin/users/:id/reject", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;

  const db = readDb();
  const profile = db.profiles.find((p: any) => p.id === id);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found." });
  }

  profile.status = "rejected";
  profile.role = ""; // Clear role

  writeDb(db);
  logAction(admin.id, admin.full_name, "USER_REJECTION", `Rejected signup request for '${profile.full_name}'`);

  res.json({ message: "User request rejected.", profile });
});

// Update / Deactivate User
app.post("/api/admin/users/:id/update", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const { role, region, status } = req.body;

  const db = readDb();
  const profile = db.profiles.find((p: any) => p.id === id);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found." });
  }

  if (role !== undefined) profile.role = role;
  if (region !== undefined) profile.region = region;
  if (status !== undefined) profile.status = status;

  writeDb(db);
  logAction(admin.id, admin.full_name, "USER_UPDATE", `Updated '${profile.full_name}' parameters (role: '${profile.role}', region: '${profile.region}', status: '${profile.status}')`);

  res.json({ message: "User updated successfully.", profile });
});

// Delete user profile (Admin only)
app.delete("/api/admin/users/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  if (id === admin.id) {
    return res.status(400).json({ error: "Cannot delete your own admin account." });
  }

  const db = readDb();
  const profileIndex = db.profiles.findIndex((p: any) => p.id === id);
  if (profileIndex === -1) {
    return res.status(404).json({ error: "Profile not found." });
  }

  const deletedProfile = db.profiles[profileIndex];
  db.profiles.splice(profileIndex, 1);

  // Clean up their campaign assignments
  db.campaign_assignments = db.campaign_assignments.filter((a: any) => a.user_id !== id);

  writeDb(db);
  logAction(admin.id, admin.full_name, "USER_DELETION", `Deleted workforce profile '${deletedProfile.full_name}' (${deletedProfile.email})`);

  res.json({ message: "User profile deleted successfully." });
});


// ================= CAMPAIGNS ENDPOINTS =================

// Get campaigns based on user assignments and roles (Simulated RLS)
app.get("/api/campaigns", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = readDb();
  
  // Admin sees ALL
  if (user.role === 'admin') {
    return res.json({ campaigns: db.campaigns });
  }

  // Get assignments for this user
  const assignments = db.campaign_assignments.filter((a: any) => a.user_id === user.id);
  const assignedCampaignIds = assignments.map((a: any) => a.campaign_id);

  // Users can only access assigned campaigns
  const filteredCampaigns = db.campaigns.filter((c: any) => {
    // Return if campaign is assigned to user
    return assignedCampaignIds.includes(c.id);
  });

  res.json({ campaigns: filteredCampaigns });
});

// Create campaign (Admin only)
app.post("/api/campaigns", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { name, client_name, campaign_type, description, start_date, end_date, submission_schema } = req.body;
  if (!name || !client_name || !campaign_type) {
    return res.status(400).json({ error: "Missing required campaign parameters." });
  }

  const db = readDb();
  const newCampId = `camp-${Date.now()}`;
  const newCampaign: Campaign = {
    id: newCampId,
    name,
    client_name,
    campaign_type,
    description: description || "",
    start_date: start_date || new Date().toISOString().split('T')[0],
    end_date: end_date || new Date().toISOString().split('T')[0],
    status: 'draft',
    submission_schema: submission_schema || [],
    created_by: admin.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.campaigns.push(newCampaign);
  writeDb(db);

  logAction(admin.id, admin.full_name, "CAMPAIGN_CREATION", `Created campaign '${name}' for '${client_name}'`);

  res.json({ message: "Campaign created in Draft status.", campaign: newCampaign });
});

// Edit Campaign (Admin only)
app.put("/api/campaigns/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const { name, client_name, campaign_type, description, start_date, end_date, status, submission_schema } = req.body;

  const db = readDb();
  const campaign = db.campaigns.find((c: any) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found." });
  }

  const statusChanged = status && campaign.status !== status;

  if (name !== undefined) campaign.name = name;
  if (client_name !== undefined) campaign.client_name = client_name;
  if (campaign_type !== undefined) campaign.campaign_type = campaign_type;
  if (description !== undefined) campaign.description = description;
  if (start_date !== undefined) campaign.start_date = start_date;
  if (end_date !== undefined) campaign.end_date = end_date;
  if (status !== undefined) campaign.status = status;
  if (submission_schema !== undefined) campaign.submission_schema = submission_schema;
  campaign.updated_at = new Date().toISOString();

  writeDb(db);

  if (statusChanged) {
    logAction(admin.id, admin.full_name, "CAMPAIGN_STATUS_CHANGE", `Updated status of '${campaign.name}' to '${status}'`);
  } else {
    logAction(admin.id, admin.full_name, "CAMPAIGN_UPDATE", `Updated details for campaign '${campaign.name}'`);
  }

  res.json({ message: "Campaign updated successfully.", campaign });
});

// Delete campaign (Admin only)
app.delete("/api/campaigns/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const db = readDb();
  
  const campaignIdx = db.campaigns.findIndex((c: any) => c.id === id);
  if (campaignIdx === -1) {
    return res.status(404).json({ error: "Campaign not found." });
  }

  const campaign = db.campaigns[campaignIdx];
  db.campaigns.splice(campaignIdx, 1);

  // Also purge assignments
  db.campaign_assignments = db.campaign_assignments.filter((a: any) => a.campaign_id !== id);
  
  writeDb(db);
  logAction(admin.id, admin.full_name, "CAMPAIGN_DELETION", `Deleted campaign '${campaign.name}' and all assignments.`);

  res.json({ message: "Campaign deleted successfully." });
});


// ================= CAMPAIGN ASSIGNMENTS ENDPOINTS =================

// Get assignments for a specific campaign (Admin or Manager)
app.get("/api/campaigns/:id/assignments", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const db = readDb();

  // Validate campaign exists
  const campaign = db.campaigns.find((c: any) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  // RLS check
  if (user.role !== 'admin') {
    const isAssigned = db.campaign_assignments.some((a: any) => a.campaign_id === id && a.user_id === user.id);
    if (!isAssigned) {
      return res.status(403).json({ error: "Forbidden: You are not assigned to this campaign." });
    }
  }

  const campaignAssignments = db.campaign_assignments.filter((a: any) => a.campaign_id === id);
  res.json({ assignments: campaignAssignments });
});

// Assign user to campaign (Admin only)
app.post("/api/campaigns/:id/assignments", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const { user_id, role_in_campaign, region_for_campaign } = req.body;

  if (!user_id || !role_in_campaign || !region_for_campaign) {
    return res.status(400).json({ error: "Missing required assignment details." });
  }

  const db = readDb();
  const campaign = db.campaigns.find((c: any) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found." });
  }

  const targetUser = db.profiles.find((p: any) => p.id === user_id);
  if (!targetUser) {
    return res.status(404).json({ error: "User not found." });
  }

  // Check if already assigned
  const existingIdx = db.campaign_assignments.findIndex((a: any) => a.campaign_id === id && a.user_id === user_id);
  
  const newAssignment: CampaignAssignment = {
    id: `assign-${Date.now()}`,
    campaign_id: id,
    user_id,
    role_in_campaign,
    region_for_campaign,
    assigned_by: admin.id,
    created_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    db.campaign_assignments[existingIdx] = newAssignment;
    logAction(admin.id, admin.full_name, "CAMPAIGN_ASSIGNMENT_UPDATE", `Reassigned '${targetUser.full_name}' in campaign '${campaign.name}' with role '${role_in_campaign}' in '${region_for_campaign}'`);
  } else {
    db.campaign_assignments.push(newAssignment);
    logAction(admin.id, admin.full_name, "CAMPAIGN_ASSIGNMENT", `Assigned '${targetUser.full_name}' to campaign '${campaign.name}' with role '${role_in_campaign}' in '${region_for_campaign}'`);
  }

  writeDb(db);

  res.json({ message: "User assigned to campaign successfully.", assignment: newAssignment });
});

// Remove assignment (Admin only)
app.delete("/api/campaign-assignments/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const db = readDb();

  const idx = db.campaign_assignments.findIndex((a: any) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Assignment not found." });
  }

  const assignment = db.campaign_assignments[idx];
  const targetUser = db.profiles.find((p: any) => p.id === assignment.user_id);
  const campaign = db.campaigns.find((c: any) => c.id === assignment.campaign_id);

  db.campaign_assignments.splice(idx, 1);
  writeDb(db);

  logAction(admin.id, admin.full_name, "CAMPAIGN_ASSIGNMENT_REMOVAL", `Removed assignment for '${targetUser ? targetUser.full_name : 'unknown user'}' from campaign '${campaign ? campaign.name : 'unknown campaign'}'`);

  res.json({ message: "Assignment removed successfully." });
});


// ================= SUBMISSIONS ENDPOINTS =================

// Get Submissions (Enforces dynamic Role-Based Security RLS policies)
app.get("/api/submissions", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = readDb();

  // Admin sees ALL
  if (user.role === 'admin') {
    return res.json({ submissions: db.submissions });
  }

  // Get active assignments of the user
  const assignments = db.campaign_assignments.filter((a: any) => a.user_id === user.id);
  const assignedCampaignIds = assignments.map((a: any) => a.campaign_id);

  // Agent: Only see their own submissions in their assigned campaigns
  if (user.role === 'agent') {
    const filtered = db.submissions.filter((s: any) => {
      return s.agent_id === user.id && assignedCampaignIds.includes(s.campaign_id);
    });
    return res.json({ submissions: filtered });
  }

  // Regional Manager: Can only see submissions within assigned campaigns AND assigned regions
  if (user.role === 'regional_manager') {
    const filtered = db.submissions.filter((s: any) => {
      // Find matches where campaign is assigned
      const isCampAssigned = assignedCampaignIds.includes(s.campaign_id);
      if (!isCampAssigned) return false;

      // Find user assignment regions for these campaigns
      const userAssignmentsForCamp = assignments.filter((a: any) => a.campaign_id === s.campaign_id);
      const assignedRegions = userAssignmentsForCamp.map((a: any) => a.region_for_campaign);

      // Check if submission region matches manager's assigned campaign regions
      return assignedRegions.includes(s.region) || s.region === user.region;
    });
    return res.json({ submissions: filtered });
  }

  res.json({ submissions: [] });
});

// Delete Submission (Admin only)
app.delete("/api/submissions/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const db = readDb();

  const idx = db.submissions.findIndex((s: any) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Submission not found." });
  }

  const sub = db.submissions[idx];
  db.submissions.splice(idx, 1);
  writeDb(db);

  logAction(admin.id, admin.full_name, "SUBMISSION_DELETION", `Deleted submission for '${sub.full_name}' in campaign ID '${sub.campaign_id}'`);

  res.json({ message: "Submission deleted successfully." });
});

// Create Submission (Form processing with Schema validation)
app.post("/api/submissions", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { 
    campaign_id, 
    full_name, 
    phone_number, 
    national_id, 
    gender, 
    date_of_birth, 
    age,
    gps_latitude, 
    gps_longitude, 
    region, 
    segment_type, 
    photo_upload, 
    dynamic_data 
  } = req.body;

  if (!campaign_id || !full_name || !phone_number || !gender || !region || !segment_type) {
    return res.status(400).json({ error: "Missing universal KYC required fields." });
  }

  const db = readDb();
  const campaign = db.campaigns.find((c: any) => c.id === campaign_id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found." });
  }

  // Check if agent is assigned to this campaign
  if (user.role !== 'admin') {
    const isAssigned = db.campaign_assignments.some((a: any) => a.campaign_id === campaign_id && a.user_id === user.id);
    if (!isAssigned) {
      return res.status(403).json({ error: "Forbidden: You are not assigned to submit data for this campaign." });
    }
  }

  // Validate campaign-specific custom fields against campaign schema
  const errors: string[] = [];
  campaign.submission_schema.forEach((field: any) => {
    if (field.required) {
      const val = dynamic_data ? dynamic_data[field.field_name] : undefined;
      if (val === undefined || val === null || val === '') {
        errors.push(`The dynamic field '${field.field_label}' is required.`);
      }
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  // Create submission
  const newSubmission: Submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    campaign_id,
    agent_id: user.id,
    full_name,
    phone_number,
    national_id: national_id || "",
    gender,
    date_of_birth: date_of_birth || "",
    age: age ? Number(age) : (date_of_birth ? new Date().getFullYear() - new Date(date_of_birth).getFullYear() : 30),
    gps_latitude: gps_latitude ? Number(gps_latitude) : 0.3476,
    gps_longitude: gps_longitude ? Number(gps_longitude) : 32.5825,
    region,
    segment_type,
    photo_upload: photo_upload || null,
    dynamic_data: dynamic_data || {},
    created_at: new Date().toISOString(),
    synced_status: 'synced'
  };

  db.submissions.unshift(newSubmission);
  writeDb(db);

  res.json({ message: "Submission successfully uploaded and registered.", submission: newSubmission });
});

// Bulk Submission Sync (Offline-first support)
app.post("/api/submissions/bulk", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { submissions } = req.body;
  if (!submissions || !Array.isArray(submissions)) {
    return res.status(400).json({ error: "Submissions array required." });
  }

  const db = readDb();
  let syncCount = 0;

  submissions.forEach((sub: any) => {
    // Generate fresh server ID or preserve client-generated ID
    const syncedSub: Submission = {
      ...sub,
      id: sub.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      agent_id: user.id, // Enforce agent constraint
      synced_status: 'synced',
      created_at: sub.created_at || new Date().toISOString()
    };
    
    // Avoid duplicates
    const existingIdx = db.submissions.findIndex((s: any) => s.id === syncedSub.id);
    if (existingIdx !== -1) {
      db.submissions[existingIdx] = syncedSub;
    } else {
      db.submissions.unshift(syncedSub);
    }
    syncCount++;
  });

  writeDb(db);
  res.json({ message: `Successfully synced ${syncCount} submissions from queue.`, count: syncCount });
});


// ================= KPI TARGETS ENDPOINTS =================

// Get KPI targets (filtered by role and assignment for RLS)
app.get("/api/kpis", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = readDb();

  // Admin sees all
  if (user.role === 'admin') {
    return res.json({ kpis: db.kpi_targets });
  }

  // Get campaign assignments of the user
  const assignments = db.campaign_assignments.filter((a: any) => a.user_id === user.id);
  const assignedCampaignIds = assignments.map((a: any) => a.campaign_id);

  // Filter KPI targets
  const filtered = db.kpi_targets.filter((target: any) => {
    // Must match assigned campaign
    if (!assignedCampaignIds.includes(target.campaign_id)) return false;

    if (user.role === 'agent') {
      // Agent sees their own targets, or campaign-wide targets
      return (target.target_type === 'campaign') || 
             (target.target_type === 'agent' && target.target_reference_id === user.id);
    }

    if (user.role === 'regional_manager') {
      // Manager sees campaign, regional targets for their region, or agent targets inside their region
      const managerRegions = assignments
        .filter((a: any) => a.campaign_id === target.campaign_id)
        .map((a: any) => a.region_for_campaign);

      if (target.target_type === 'campaign') return true;
      if (target.target_type === 'region' && managerRegions.includes(target.target_reference_id)) return true;
      if (target.target_type === 'agent') {
        // Agent must belong to manager's region
        const agentProfile = db.profiles.find((p: any) => p.id === target.target_reference_id);
        return agentProfile && managerRegions.includes(agentProfile.region);
      }
    }

    return false;
  });

  res.json({ kpis: filtered });
});

// Create KPI target (Admin only)
app.post("/api/kpis", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { campaign_id, target_type, target_reference_id, metric_name, target_value, start_date, end_date } = req.body;
  
  if (!campaign_id || !target_type || !metric_name || !target_value) {
    return res.status(400).json({ error: "Missing required KPI target parameters." });
  }

  const db = readDb();
  const campaign = db.campaigns.find((c: any) => c.id === campaign_id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found." });
  }

  const newTarget: KpiTarget = {
    id: `target-${Date.now()}`,
    campaign_id,
    target_type,
    target_reference_id: target_reference_id || null,
    metric_name,
    target_value: Number(target_value),
    start_date: start_date || campaign.start_date,
    end_date: end_date || campaign.end_date,
    created_by: admin.id,
    created_at: new Date().toISOString()
  };

  db.kpi_targets.push(newTarget);
  writeDb(db);

  let refName = "Campaign-wide";
  if (target_type === 'region') refName = `Region: ${target_reference_id}`;
  if (target_type === 'agent') {
    const ag = db.profiles.find((p: any) => p.id === target_reference_id);
    refName = ag ? `Agent: ${ag.full_name}` : `Agent: ${target_reference_id}`;
  }

  logAction(admin.id, admin.full_name, "KPI_TARGET_CREATION", `Created target (${target_value} ${metric_name}) for '${campaign.name}' - ${refName}`);

  res.json({ message: "KPI Target created.", target: newTarget });
});

// Update KPI target (Admin only)
app.put("/api/kpis/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const { target_value, start_date, end_date, metric_name } = req.body;

  const db = readDb();
  const target = db.kpi_targets.find((t: any) => t.id === id);
  if (!target) {
    return res.status(404).json({ error: "KPI target not found." });
  }

  if (target_value !== undefined) target.target_value = Number(target_value);
  if (start_date !== undefined) target.start_date = start_date;
  if (end_date !== undefined) target.end_date = end_date;
  if (metric_name !== undefined) target.metric_name = metric_name;

  writeDb(db);
  logAction(admin.id, admin.full_name, "KPI_TARGET_UPDATE", `Updated KPI target details for target ID ${id}`);

  res.json({ message: "KPI Target updated.", target });
});

// Delete KPI target (Admin only)
app.delete("/api/kpis/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }

  const { id } = req.params;
  const db = readDb();

  const idx = db.kpi_targets.findIndex((t: any) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "KPI target not found." });
  }

  db.kpi_targets.splice(idx, 1);
  writeDb(db);

  logAction(admin.id, admin.full_name, "KPI_TARGET_DELETION", `Deleted KPI target ID ${id}`);

  res.json({ message: "KPI Target deleted." });
});


// ================= AUDIT LOGS ENDPOINTS =================

// Get Audit Logs (Admin only)
app.get("/api/audit-logs", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access only." });
  }
  const db = readDb();
  
  // Also register an audit log read action for audit logging of exports/logs
  const logLimit = req.query.limit ? Number(req.query.limit) : 100;
  res.json({ audit_logs: db.audit_logs.slice(0, logLimit) });
});

// Create Manual Audit Log (for exporting data etc.)
app.post("/api/audit-logs", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { action, details } = req.body;
  if (!action || !details) {
    return res.status(400).json({ error: "Action and details required." });
  }
  logAction(user.id, user.full_name, action, details);
  res.json({ success: true });
});


// ================= DATA SEED / TEST SCENARIO TOOL =================

// Resets/Re-seeds DB
app.post("/api/test/seed", (req, res) => {
  const user = getAuthUser(req);
  // Allow admin or anyone executing in dev mode
  if (user && user.role !== 'admin' && process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Reload default static JSON data
  const defaultDbRaw = fs.readFileSync(path.resolve(process.cwd(), 'src', 'db_store.json'), 'utf-8');
  writeDb(JSON.parse(defaultDbRaw));

  res.json({ message: "Database re-seeded successfully." });
});


// ================= VITE OR STATIC SERVING =================

async function startServer() {
  // Vite dev server mounting in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA Fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
