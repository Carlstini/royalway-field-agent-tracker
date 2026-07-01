/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: 'admin' | 'regional_manager' | 'agent' | '';
  requested_role: 'admin' | 'regional_manager' | 'agent';
  status: 'pending' | 'approved' | 'rejected';
  region: string;
  created_at: string;
  password_hash?: string;
  password_salt?: string;
}

export interface CampaignField {
  id: string;
  field_name: string; // key e.g. "funding_amount"
  field_label: string; // label e.g. "Funding Amount"
  field_type: 'text' | 'number' | 'dropdown' | 'currency' | 'checkbox' | 'radio' | 'date' | 'textarea' | 'file upload' | 'GPS/location';
  required: boolean;
  visible: boolean;
  placeholder?: string;
  validation_rules?: string; // validation rules
  field_options?: string[]; // options for dropdown/radio
}

export interface Campaign {
  id: string;
  name: string;
  client_name: string;
  campaign_type: 'bank' | 'telecom' | 'NGO' | 'FMCG' | 'government' | 'survey' | 'education' | 'other';
  description: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  submission_schema: CampaignField[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignAssignment {
  id: string;
  campaign_id: string;
  user_id: string;
  role_in_campaign: 'agent' | 'regional_manager';
  region_for_campaign: string;
  assigned_by: string;
  created_at: string;
}

export interface Submission {
  id: string;
  campaign_id: string;
  agent_id: string;
  // Universal KYC/customer fields
  full_name: string;
  phone_number: string;
  national_id?: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  age?: number;
  gps_latitude: number;
  gps_longitude: number;
  region: string;
  segment_type: string;
  photo_upload?: string; // base64 representation or mockup URL
  // Dynamic fields
  dynamic_data: Record<string, any>;
  created_at: string;
  synced_status: 'synced' | 'pending';
}

export interface KpiTarget {
  id: string;
  campaign_id: string;
  target_type: 'campaign' | 'region' | 'team' | 'agent';
  target_reference_id: string | null; // stores region name, team name, agent user_id, or null for campaign-wide
  metric_name: string; // e.g., "submissions", "onboarding_count", "funding_amount", "farmer_registrations"
  target_value: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface SeedDataPayload {
  profiles: UserProfile[];
  campaigns: Campaign[];
  campaign_assignments: CampaignAssignment[];
  submissions: Submission[];
  kpi_targets: KpiTarget[];
  audit_logs: AuditLog[];
}
