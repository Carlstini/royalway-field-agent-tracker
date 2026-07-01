/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Shield, Key, Mail, User, Phone, MapPin, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import RoyalwayLogo from './RoyalwayLogo';
import { isSandboxActive, setSandboxActive } from '../lib/sandboxFetch';

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
  isOffline: boolean;
}

export default function Login({ onLoginSuccess, isOffline }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Real password auth
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestedRole, setRequestedRole] = useState<'admin' | 'regional_manager' | 'agent'>('agent');
  const [region, setRegion] = useState('Central');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Sandbox mode state
  const [sandboxActive, setSandboxActiveState] = useState(isSandboxActive());

  const toggleSandboxLocal = () => {
    const nextState = !sandboxActive;
    setSandboxActive(nextState);
    setSandboxActiveState(nextState);
    setError(null);
    setMessage(null);
  };

  const enableSandboxModeAndLogin = () => {
    setSandboxActive(true);
    setSandboxActiveState(true);
    setError(null);
    setMessage(null);
    
    // Automatically log in as Sempala Carlton (admin)
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
      }
    ];
    onLoginSuccess(DEFAULT_PROFILES[0]);
  };

  // Rate Limiter state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  React.useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(l => l - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline && !sandboxActive) {
      setError("You cannot log in while offline. Please restore simulated network connectivity in the MVP panel.");
      return;
    }

    if (lockoutTime > 0) {
      setError(`Login rate-limited. Too many attempts. Please wait ${lockoutTime} seconds.`);
      return;
    }

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      let data;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          if (text.includes("<!doctype html") || text.includes("<html") || text.includes("<!DOCTYPE html")) {
            throw new Error("STATIC_HOSTING_DETECTED");
          }
          throw new Error("Invalid response from server.");
        }
      } catch (parseErr: any) {
        if (parseErr.message === "STATIC_HOSTING_DETECTED" || (parseErr.message && parseErr.message.includes("did not match the expected pattern"))) {
          throw new Error("STATIC_HOSTING_DETECTED");
        }
        throw new Error("The API server returned an invalid or unparseable response.");
      }

      if (!response.ok) {
        // Increment failed attempts
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        if (nextFailed >= 3) {
          setLockoutTime(30); // Lock for 30 seconds
          setFailedAttempts(0);
          throw new Error("Too many failed attempts. Security lock engaged. Please wait 30 seconds.");
        }
        throw new Error(data.error || "Authentication failed.");
      }

      onLoginSuccess(data.profile);
    } catch (err: any) {
      if (err.message === "STATIC_HOSTING_DETECTED" || (err.message && err.message.includes("did not match the expected pattern"))) {
        setError("STATIC_HOSTING_DETECTED");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline && !sandboxActive) {
      setError("Signups require an online connection. Restore internet state in the control panel.");
      return;
    }

    if (!email || !fullName || !phoneNumber || !password) {
      setError("Please fill in all required fields including password.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          full_name: fullName,
          phone_number: phoneNumber,
          requested_role: requestedRole,
          region,
          password
        })
      });

      let data;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          if (text.includes("<!doctype html") || text.includes("<html") || text.includes("<!DOCTYPE html")) {
            throw new Error("STATIC_HOSTING_DETECTED");
          }
          throw new Error("Invalid response from server.");
        }
      } catch (parseErr: any) {
        if (parseErr.message === "STATIC_HOSTING_DETECTED" || (parseErr.message && parseErr.message.includes("did not match the expected pattern"))) {
          throw new Error("STATIC_HOSTING_DETECTED");
        }
        throw new Error("The API server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Signup failed.");
      }

      setMessage("Signup submitted successfully! Your account is now PENDING approval. An administrator must approve your requested role before you can access the operational dashboard.");
      setIsSignUp(false);
      // Clear inputs
      setFullName('');
      setPhoneNumber('');
      setPassword('');
    } catch (err: any) {
      if (err.message === "STATIC_HOSTING_DETECTED" || (err.message && err.message.includes("did not match the expected pattern"))) {
        setError("STATIC_HOSTING_DETECTED");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo and Brand */}
        <div className="flex justify-center mb-1">
          <RoyalwayLogo variant="vertical" size="xl" />
        </div>
        <p className="mt-2 text-xs text-slate-500 font-semibold tracking-wide uppercase">
          Campaign-Centric Operational Platform (Uganda MVP)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          
          {/* Database Engine Switcher Panel */}
          <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine Mode</span>
              <span className="text-xs font-semibold text-slate-800">
                {sandboxActive ? 'Offline Sandbox' : 'Full-Stack Server'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSandboxLocal}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                sandboxActive 
                  ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600' 
                  : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
              }`}
            >
              {sandboxActive ? '📁 Switch to Server' : '⚙️ Switch to Sandbox'}
            </button>
          </div>

          {error === "STATIC_HOSTING_DETECTED" ? (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl">
              <div className="flex gap-2.5 items-start">
                <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-sm text-amber-950 mb-1">Full-Stack Hosting Mismatch</h4>
                  <p className="text-xs leading-relaxed text-amber-800">
                    This application is a full-stack platform. It looks like it is deployed on a static hosting service (like Netlify) which does not run the backend Node.js Express server (<code className="bg-amber-100 px-1 rounded font-mono text-[10px]">server.ts</code>).
                  </p>
                  <p className="text-xs leading-relaxed text-amber-800 mt-2">
                    To connect to a live backend, you can deploy to a container runtime like Google Cloud Run or Render.
                  </p>
                  <div className="mt-3 p-3 bg-amber-100/60 rounded-xl border border-amber-200/80 flex flex-col gap-2">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      💡 Run Client-Side Sandbox:
                    </span>
                    <p className="text-[11px] leading-normal text-amber-800">
                      Alternatively, launch our fully interactive offline sandbox mode. The entire database (campaigns, users, submissions) will run in your browser's local storage with no backend required!
                    </p>
                    <button
                      type="button"
                      onClick={enableSandboxModeAndLogin}
                      className="w-full mt-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      🚀 Launch Local Sandbox Mode & Sign In
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg flex gap-2 items-start animate-pulse">
              <AlertTriangle className="shrink-0 text-rose-500 mt-0.5" size={16} />
              <div>
                <span className="font-semibold">Security Gate:</span> {error}
              </div>
            </div>
          ) : null}

          {message && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-sm rounded-lg flex gap-2.5 items-start">
              <Clock className="shrink-0 text-emerald-600 mt-0.5 animate-spin" size={18} />
              <div>
                <span className="font-semibold">Registration Filed:</span> {message}
                <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
                  Status: PENDING ADMIN APPROVAL
                </div>
              </div>
            </div>
          )}

          {!isSignUp ? (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-400" /> Registered Email
                </label>
                <input
                  type="email"
                  id="login-email"
                  required
                  placeholder="e.g., agent@royalwaymedia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Key size={12} className="text-slate-400" /> Access Passcode</span>
                </label>
                <input
                  type="password"
                  id="login-password"
                  required
                  placeholder="Enter your account passcode"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading || lockoutTime > 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Operations'}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Need operational credentials? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                    setMessage(null);
                    setPassword('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Request Account Approval
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <User size={12} className="text-slate-400" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., David Okello"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-400" /> Corporate or Operational Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., david.okello@royalwaymedia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Phone size={12} className="text-slate-400" /> Contact Number (WhatsApp/MTN/Airtel)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., +256 772 111 222"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Key size={12} className="text-slate-400" /> Create Access Passcode
                </label>
                <input
                  type="password"
                  required
                  placeholder="Choose a passcode for your account"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                    Requested Role
                  </label>
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="agent">Field Agent</option>
                    <option value="regional_manager">Regional Manager</option>
                    <option value="admin">Administrator (Restricted)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" /> Home Region
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Central">Central (Kampala)</option>
                    <option value="Western">Western (Mbarara)</option>
                    <option value="Eastern">Eastern (Jinja)</option>
                    <option value="Northern">Northern (Gulu)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                id="btn-signup-submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Submitting Application...' : 'Request Onboarding Approval'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                    setMessage(null);
                    setPassword('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
