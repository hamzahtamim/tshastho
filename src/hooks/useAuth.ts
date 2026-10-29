"use client";

import { useEffect, useState } from "react";

export type AuthUser = {
  avatarUrl?: string | null;
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  isVerified: boolean;
  address: string | null;
  parentPharmacyId: string | null;
  staffRole: string | null;
  permissions: any;
  patientProfile?: any;
  doctorProfile?: any;
  pharmacyProfile?: any;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (mounted) setUser(data.user);
        }
      } catch (e) {
        // not logged in
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/login";
    }
  };

  return { user, loading, logout };
}
