import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/ensureProfile";

type AppRole = "free" | "vault_os_owner" | "vault_access" | "vault_intelligence" | "operator";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  discipline_status: "active" | "inactive";
  discipline_score: number;
  onboarding_completed: boolean;
  default_trading_style: string;
  initialized_at: string | null;
  access_status: "trial" | "active" | "revoked";
  academy_experience: string;
}

interface UserRole {
  role: AppRole;
  subscription_status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasMinRole: (minRole: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleHierarchy: AppRole[] = ["free", "vault_os_owner", "vault_access", "vault_intelligence", "operator"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer data fetching to avoid blocking auth state
          setTimeout(async () => {
            // Ensure profile exists on first login
            await ensureProfile(newSession.user.id, newSession.user.email);
            fetchUserData(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        // Ensure profile exists
        await ensureProfile(initialSession.user.id, initialSession.user.email);
        fetchUserData(initialSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
 
   async function fetchUserData(userId: string) {
     try {
       // Fetch profile
       const { data: profileData } = await supabase
         .from("profiles")
         .select("*")
         .eq("user_id", userId)
         .maybeSingle();
 
       if (profileData) {
         setProfile(profileData as Profile);
       }
 
       // Fetch user role
       const { data: roleData } = await supabase
         .from("user_roles")
         .select("role, subscription_status")
         .eq("user_id", userId)
         .maybeSingle();
 
       if (roleData) {
         setUserRole(roleData as UserRole);
       }
     } catch (error) {
       console.error("Error fetching user data:", error);
     } finally {
       setLoading(false);
     }
   }
 
   async function signUp(email: string, password: string) {
     const { error } = await supabase.auth.signUp({
       email,
       password,
       options: {
         emailRedirectTo: window.location.origin,
       },
     });
     return { error };
   }
 
   async function signIn(email: string, password: string) {
     const { error } = await supabase.auth.signInWithPassword({
       email,
       password,
     });
     return { error };
   }
 
   async function signOut() {
     await supabase.auth.signOut();
     setProfile(null);
     setUserRole(null);
   }
 
   function hasRole(role: AppRole): boolean {
     if (!userRole) return false;
     return userRole.role === role;
   }
 
   function hasMinRole(minRole: AppRole): boolean {
     if (!userRole) return false;
     const userRoleIndex = roleHierarchy.indexOf(userRole.role);
     const minRoleIndex = roleHierarchy.indexOf(minRole);
     return userRoleIndex >= minRoleIndex;
   }
 
   const value = {
     user,
     session,
     profile,
     userRole,
     loading,
     signUp,
     signIn,
     signOut,
     hasRole,
     hasMinRole,
   };
 
   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
 }
 
 export function useAuth() {
   const context = useContext(AuthContext);
   if (context === undefined) {
     throw new Error("useAuth must be used within an AuthProvider");
   }
   return context;
 }