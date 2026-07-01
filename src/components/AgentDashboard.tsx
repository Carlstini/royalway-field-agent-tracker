/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Campaign, Submission, UserProfile, KpiTarget } from '../types';
import { 
  Plus, Check, Signal, SignalZero, WifiOff, Camera, MapPin, 
  Layers, User, CheckCircle2, TrendingUp, Award, Clock, ArrowRight 
} from 'lucide-react';

interface AgentDashboardProps {
  profile: UserProfile;
  campaigns: Campaign[];
  submissions: Submission[];
  kpis: KpiTarget[];
  isOffline: boolean;
  onNewSubmission: (submission: any) => Promise<void>;
  onRefreshData: () => Promise<void>;
}

export default function AgentDashboard({
  profile,
  campaigns,
  submissions,
  kpis,
  isOffline,
  onNewSubmission,
  onRefreshData
}: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'submissions' | 'stats'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Offline sync queue state
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('1998-01-01');
  const [gps, setGps] = useState<{ lat: number; lng: number }>({ lat: 0.3476, lng: 32.5825 }); // Default Kampala
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'failed'>('idle');
  const [region, setRegion] = useState(profile.region || 'Western');
  const [segmentType, setSegmentType] = useState('Rural');
  const [photo, setPhoto] = useState<string | null>(null);
  
  // Custom Dynamic fields answers state
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formSuccess, setFormSuccess] = useState(false);

  // Load offline queue on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem(`offline_queue_${profile.id}`);
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error("Failed to parse offline queue", e);
      }
    }
  }, [profile.id]);

  // Save offline queue when updated
  const saveOfflineQueue = (newQueue: any[]) => {
    setOfflineQueue(newQueue);
    localStorage.setItem(`offline_queue_${profile.id}`, JSON.stringify(newQueue));
  };

  // Automated sync when coming back online
  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      triggerBulkSync();
    }
  }, [isOffline, offlineQueue.length]);

  // GPS capture
  const captureGps = () => {
    setGpsStatus('locating');
    if (!navigator.geolocation) {
      setGpsStatus('failed');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6))
        });
        setGpsStatus('success');
      },
      () => {
        // Mock slightly randomized Kampala field coordinates to represent real offline field operations
        const rLat = 0.3 + (Math.random() - 0.5) * 0.1;
        const rLng = 32.5 + (Math.random() - 0.5) * 0.1;
        setGps({ lat: Number(rLat.toFixed(6)), lng: Number(rLng.toFixed(6)) });
        setGpsStatus('success');
      },
      { timeout: 5000 }
    );
  };

  // Simulate file camera snap
  const simulatePhotoSnap = () => {
    // Generate a beautiful avatar placeholder block to simulate field device upload
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = randomColor;
      ctx.fillRect(0, 0, 150, 150);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fullName ? fullName.split(' ')[0] : 'KYC', 75, 85);
    }
    setPhoto(canvas.toDataURL());
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setFormSuccess(false);

    if (!selectedCampaign) return;

    // Standard Universal field validation
    if (!fullName || !phoneNumber) {
      setFormErrors(["Universal fields 'Full Name' and 'Phone Number' are required for standard KYC onboarding."]);
      return;
    }

    // Dynamic campaign fields validation
    const errors: string[] = [];
    selectedCampaign.submission_schema.forEach((field) => {
      if (field.required) {
        const val = dynamicAnswers[field.field_name];
        if (val === undefined || val === null || val === '') {
          errors.push(`Campaign-specific field '${field.field_label}' is required.`);
        }
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Calculate age based on date of birth
    const ageValue = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 25;

    // Construct submission record
    const subRecord = {
      id: `client-sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      campaign_id: selectedCampaign.id,
      agent_id: profile.id,
      full_name: fullName,
      phone_number: phoneNumber,
      national_id: nationalId || "",
      gender,
      date_of_birth: dob,
      age: ageValue,
      gps_latitude: gps.lat,
      gps_longitude: gps.lng,
      region,
      segment_type: segmentType,
      photo_upload: photo,
      dynamic_data: dynamicAnswers,
      created_at: new Date().toISOString(),
      synced_status: isOffline ? 'pending' : 'synced'
    };

    if (isOffline) {
      // Offline-first: save to local state queue
      const updatedQueue = [...offlineQueue, subRecord];
      saveOfflineQueue(updatedQueue);
      setFormSuccess(true);
      resetFormInputs();
      await onRefreshData(); // refresh parent metrics
    } else {
      // Sync immediately via API
      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': profile.id
          },
          body: JSON.stringify(subRecord)
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit data.");
        }
        setFormSuccess(true);
        resetFormInputs();
        await onNewSubmission(data.submission);
      } catch (err: any) {
        setFormErrors([`API Sync Error: ${err.message}. Saving to local offline queue instead.`]);
        // Fallback to queue if API fails
        const updatedQueue = [...offlineQueue, subRecord];
        saveOfflineQueue(updatedQueue);
        setFormSuccess(true);
        resetFormInputs();
      }
    }
  };

  const triggerBulkSync = async () => {
    if (offlineQueue.length === 0 || isOffline) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/submissions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': profile.id
        },
        body: JSON.stringify({ submissions: offlineQueue })
      });
      if (response.ok) {
        // Clear queue
        saveOfflineQueue([]);
        await onRefreshData();
        alert("Success: Offline local submissions synchronized with Royalway Central Database!");
      } else {
        const d = await response.json();
        alert(`Sync Warning: Some submissions failed validation (${d.error})`);
      }
    } catch (e: any) {
      alert(`Sync Error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const resetFormInputs = () => {
    setFullName('');
    setPhoneNumber('');
    setNationalId('');
    setGender('Male');
    setDob('1998-01-01');
    setPhoto(null);
    setDynamicAnswers({});
    setGpsStatus('idle');
  };

  // Calculations for Agent stats
  const agentSubmissions = submissions.filter(s => s.agent_id === profile.id);
  const totalSubCount = agentSubmissions.length;

  // Active target for this agent
  const agentTarget = kpis.find(k => k.target_type === 'agent' && k.target_reference_id === profile.id);
  
  // Progress calculations
  const targetVal = agentTarget?.target_value || 100;
  const currentProgressPct = Math.min(100, Math.round((totalSubCount / targetVal) * 100));

  const getTargetStatusLabel = (pct: number) => {
    if (pct >= 100) return { label: 'Completed', color: 'bg-emerald-500 text-white' };
    if (pct >= 60) return { label: 'On Track', color: 'bg-blue-600 text-white' };
    return { label: 'Behind Target', color: 'bg-rose-500 text-white' };
  };

  const targetStatus = getTargetStatusLabel(currentProgressPct);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans">
      
      {/* Offline Alert Box */}
      {isOffline && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="text-amber-500" size={18} />
            <span className="font-semibold">Offline Mode Active:</span>
            <span>Submissions will queue locally and auto-sync on connection.</span>
          </div>
          <span className="text-xs bg-amber-200 px-2 py-0.5 rounded-full font-mono font-bold">
            {offlineQueue.length} Pending Sync
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white mb-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-blue-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
              <Signal size={12} />
              <span>Royalway Uganda Field Portal</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Field Agent • Assigned Region: <span className="font-semibold text-white">{profile.region}</span>
            </p>
          </div>
          
          <div className="flex gap-3 items-center">
            {offlineQueue.length > 0 && (
              <button
                onClick={triggerBulkSync}
                disabled={isOffline || syncing}
                className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Pending Queue'}
                <span className="bg-slate-800 text-blue-400 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md">
                  {offlineQueue.length}
                </span>
              </button>
            )}
            
            <div className="text-right border-l border-slate-700 pl-4">
              <div className="text-2xl font-mono font-bold text-blue-400">{totalSubCount}</div>
              <div className="text-[10px] uppercase text-slate-400 tracking-wider font-semibold">My Submissions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => { setActiveTab('campaigns'); setSelectedCampaign(null); }}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'campaigns' 
              ? 'border-slate-900 text-slate-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Assigned Campaigns
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'submissions' 
              ? 'border-slate-900 text-slate-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Submissions Log
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'stats' 
              ? 'border-slate-900 text-slate-900 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Targets & Rankings
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS & DYNAMIC SUBMISSION FORMS */}
      {activeTab === 'campaigns' && (
        <div>
          {!selectedCampaign ? (
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-4">Active Field Assignments</h2>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Layers className="text-slate-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-slate-700">No Assigned Campaigns</h3>
                  <p className="text-xs text-slate-500 mt-1">You are not currently assigned to any campaigns in this region.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {campaigns.map((camp) => (
                    <div 
                      key={camp.id} 
                      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                            {camp.campaign_type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{camp.start_date} to {camp.end_date}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{camp.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{camp.description}</p>
                        
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <CheckCircle2 size={13} className="text-slate-400" />
                          <span>Universal KYC + {camp.submission_schema.length} custom fields configured.</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          Submissions count: <span className="font-bold text-slate-800">{submissions.filter(s => s.campaign_id === camp.id).length}</span>
                        </div>
                        <button
                          id={`btn-open-campaign-${camp.id}`}
                          onClick={() => {
                            setSelectedCampaign(camp);
                            setDynamicAnswers({});
                            setFormErrors([]);
                            setFormSuccess(false);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1 transition-all"
                        >
                          Open Form <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // DYNAMIC FIELD FORM RENDERER
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
                <div>
                  <button 
                    onClick={() => setSelectedCampaign(null)} 
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1"
                  >
                    ← Back to Campaigns
                  </button>
                  <h2 className="text-lg font-bold text-slate-900">
                    Onboarding Form: <span className="text-slate-600">{selectedCampaign.name}</span>
                  </h2>
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 font-mono font-bold px-2.5 py-1 rounded-lg uppercase border border-blue-100">
                  {selectedCampaign.campaign_type}
                </span>
              </div>

              {formSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-semibold">Submission Processed!</span> Data has been logged. {isOffline ? "Saved locally to sync queue." : "Uploaded directly to system."}
                  </div>
                </div>
              )}

              {formErrors.length > 0 && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl space-y-1">
                  <span className="font-bold block text-sm">Please correct validation errors:</span>
                  {formErrors.map((err, i) => (
                    <div key={i} className="flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-6">
                
                {/* 1. UNIVERSAL KYC FIELDS */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 pb-1 border-b border-slate-50 flex items-center gap-1.5">
                    <User size={13} />
                    Section A: Universal Customer KYC
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Customer Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="First and last name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g., +2567..."
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        National ID (NIN)
                      </label>
                      <input
                        type="text"
                        placeholder="NIN (e.g., CM95...)"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Geolocation & Photo Upload Row */}
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Capture Coordinates</span>
                        <span className="text-[10px] text-slate-400 font-mono">{gps.lat}, {gps.lng}</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={captureGps}
                          className="px-3.5 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1"
                        >
                          <MapPin size={14} className="text-slate-500" />
                          {gpsStatus === 'locating' ? 'Locating...' : 'Fetch Geolocation'}
                        </button>
                        <span className="text-xs text-slate-400 self-center">
                          {gpsStatus === 'success' ? '✅ Logged' : 'Auto-Mocks Offline'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Region</label>
                        <select
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="Central">Central (Kampala)</option>
                          <option value="Western">Western (Mbarara)</option>
                          <option value="Eastern">Eastern (Jinja)</option>
                          <option value="Northern">Northern (Gulu)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Segment Type</label>
                        <select
                          value={segmentType}
                          onChange={(e) => setSegmentType(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="Rural">Rural</option>
                          <option value="Urban">Urban</option>
                          <option value="Semi-Urban">Semi-Urban</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">KYC Document Upload / Portrait Snap</label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={simulatePhotoSnap}
                        className="p-4 border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-500"
                      >
                        <Camera size={20} />
                        <span className="text-[10px] font-semibold">Take Mock Photo</span>
                      </button>
                      {photo ? (
                        <div className="relative">
                          <img src={photo} alt="Avatar" className="w-16 h-16 rounded-xl object-cover border border-slate-300" />
                          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white p-0.5 rounded-full">
                            <Check size={10} />
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No image uploaded</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. DYNAMIC CAMPAIGN FIELDS */}
                {selectedCampaign.submission_schema.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 pb-1 border-b border-slate-50 flex items-center gap-1.5">
                      <Layers size={13} />
                      Section B: Campaign Specific Fields ({selectedCampaign.client_name})
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedCampaign.submission_schema.map((field) => {
                        return (
                          <div key={field.id} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              {field.field_label} {field.required && <span className="text-rose-500">*</span>}
                            </label>
                            
                            {/* Render Text Inputs */}
                            {(field.field_type === 'text' || field.field_type === 'currency') && (
                              <input
                                type="text"
                                placeholder={field.placeholder || ""}
                                value={dynamicAnswers[field.field_name] || ''}
                                onChange={(e) => setDynamicAnswers({
                                  ...dynamicAnswers,
                                  [field.field_name]: e.target.value
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                              />
                            )}

                            {/* Render Numbers */}
                            {field.field_type === 'number' && (
                              <input
                                type="number"
                                step="any"
                                placeholder={field.placeholder || "0"}
                                value={dynamicAnswers[field.field_name] || ''}
                                onChange={(e) => setDynamicAnswers({
                                  ...dynamicAnswers,
                                  [field.field_name]: e.target.value
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                              />
                            )}

                            {/* Render Textarea */}
                            {field.field_type === 'textarea' && (
                              <textarea
                                rows={3}
                                placeholder={field.placeholder || ""}
                                value={dynamicAnswers[field.field_name] || ''}
                                onChange={(e) => setDynamicAnswers({
                                  ...dynamicAnswers,
                                  [field.field_name]: e.target.value
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                              />
                            )}

                            {/* Render Date */}
                            {field.field_type === 'date' && (
                              <input
                                type="date"
                                value={dynamicAnswers[field.field_name] || ''}
                                onChange={(e) => setDynamicAnswers({
                                  ...dynamicAnswers,
                                  [field.field_name]: e.target.value
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                              />
                            )}

                            {/* Render Dropdown */}
                            {field.field_type === 'dropdown' && (
                              <select
                                value={dynamicAnswers[field.field_name] || ''}
                                onChange={(e) => setDynamicAnswers({
                                  ...dynamicAnswers,
                                  [field.field_name]: e.target.value
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-medium"
                              >
                                <option value="">-- Choose option --</option>
                                {field.field_options?.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {/* Render Checkbox */}
                            {field.field_type === 'checkbox' && (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="checkbox"
                                  id={`chk-${field.id}`}
                                  checked={!!dynamicAnswers[field.field_name]}
                                  onChange={(e) => setDynamicAnswers({
                                    ...dynamicAnswers,
                                    [field.field_name]: e.target.checked
                                  })}
                                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                                />
                                <label htmlFor={`chk-${field.id}`} className="text-xs text-slate-500 font-medium">
                                  Confirm activation or acknowledgement
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedCampaign(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-operational-form"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                  >
                    Submit Submissions {isOffline ? '(Queue Offline)' : '(Upload Live)'}
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SUBMISSIONS LOG */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Personal Submissions Registry</h2>
          {agentSubmissions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm italic">
              No submissions uploaded yet. Head to Assigned Campaigns to register your first record!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Region</th>
                    <th className="p-3">Universal KYC</th>
                    <th className="p-3">Dynamic Custom Data</th>
                    <th className="p-3">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentSubmissions.map((sub) => {
                    const c = campaigns.find(camp => camp.id === sub.campaign_id);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{sub.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{c ? c.name : 'Unknown Campaign'}</div>
                        </td>
                        <td className="p-3 text-xs text-slate-500 font-mono">{sub.phone_number}</td>
                        <td className="p-3 text-xs font-medium">{sub.region} ({sub.segment_type})</td>
                        <td className="p-3 text-xs text-slate-500">
                          Gender: {sub.gender} | DOB: {sub.date_of_birth}
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          {Object.keys(sub.dynamic_data).length > 0 ? (
                            <div className="bg-slate-50 p-2 rounded-lg font-mono text-[10px] space-y-0.5">
                              {Object.entries(sub.dynamic_data).map(([k, v]) => (
                                <div key={k}>
                                  <span className="font-semibold text-slate-500">{k}:</span> {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="italic text-slate-400">None</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-semibold font-mono text-[10px] inline-flex items-center gap-1 ${
                            sub.synced_status === 'synced' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sub.synced_status === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {sub.synced_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TARGETS & RANKINGS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          
          {/* Targets Progress Bars */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-1.5">
              <TrendingUp className="text-slate-500" size={18} />
              KPI Targets Completion Status
            </h2>
            
            {agentTarget ? (
              <div className="space-y-4">
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                        {agentTarget.metric_name} Target
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Duration: {agentTarget.start_date} to {agentTarget.end_date}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${targetStatus.color}`}>
                      {targetStatus.label} ({currentProgressPct}%)
                    </span>
                  </div>

                  <div className="flex items-end gap-2 my-3">
                    <span className="text-3xl font-bold font-mono text-slate-900">{totalSubCount}</span>
                    <span className="text-sm font-semibold text-slate-500 mb-1">/ {targetVal} Submissions</span>
                  </div>

                  {/* Progressive Bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        currentProgressPct >= 100 ? 'bg-emerald-500' :
                        currentProgressPct >= 60 ? 'bg-blue-600' : 'bg-rose-500'
                      }`}
                      style={{ width: `${currentProgressPct}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-1.5">
                    <span>0%</span>
                    <span>Remaining to complete: {Math.max(0, targetVal - totalSubCount)} submissions</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 text-center py-8 text-slate-500 text-xs italic">
                No individual agent target assigned by administrator for this period. Defaulting to standard 100 submissions goal.
              </div>
            )}
          </div>

          {/* Ranking card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-1.5">
              <Award className="text-amber-500" size={18} />
              Western Region Performance Ranking
            </h2>
            <p className="text-xs text-slate-500 mb-4">Your current position among agents active in your assigned territory:</p>
            
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 font-bold font-mono text-lg rounded-full flex items-center justify-center border border-amber-200 shadow-sm shrink-0">
                #1
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Top Performer Status</div>
                <p className="text-xs text-slate-500 mt-0.5">You are leading the Centenary Bank Smart Saver activation in Western Uganda with {totalSubCount} registered submissions.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
