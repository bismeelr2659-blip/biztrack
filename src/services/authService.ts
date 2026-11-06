import { auth, isFirebaseConfigured } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile
} from 'firebase/auth';

export type UserRole = 'admin' | 'manager' | 'member';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

const AUTH_USER_STORAGE_KEY = 'biztrack_current_auth_user';
const USERS_DIRECTORY_KEY = 'biztrack_registered_users_v1';

class AuthService {
  private currentUser: AuthUser | null = null;
  private authListeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    // Load persisted local user
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem(AUTH_USER_STORAGE_KEY);
        if (cached) {
          this.currentUser = JSON.parse(cached);
        }
      } catch (e) {
        console.warn('Failed to parse cached auth user:', e);
      }
    }

    // Connect to Firebase auth state if available
    if (isFirebaseConfigured && auth) {
      try {
        firebaseOnAuthStateChanged(auth, (fbUser) => {
          if (fbUser) {
            const registeredUser = this.findUserByEmail(fbUser.email || '');
            const user: AuthUser = {
              id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || registeredUser?.name || fbUser.email?.split('@')[0] || 'User',
              company: registeredUser?.company || 'My Workspace',
              role: registeredUser?.role || 'admin',
              createdAt: registeredUser?.createdAt || new Date().toISOString(),
            };
            this.setCurrentUser(user);
          } else if (!this.currentUser) {
            this.setCurrentUser(null);
          }
        });
      } catch (err) {
        console.warn('Firebase auth listener init issue:', err);
      }
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public onAuthStateChange(listener: (user: AuthUser | null) => void): () => void {
    this.authListeners.push(listener);
    // Immediate callback with current state
    listener(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== listener);
    };
  }

  private setCurrentUser(user: AuthUser | null) {
    this.currentUser = user;
    if (typeof localStorage !== 'undefined') {
      if (user) {
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      }
    }
    this.authListeners.forEach((l) => {
      try {
        l(user);
      } catch (err) {
        console.error('Error calling auth listener:', err);
      }
    });
  }

  public async signIn(email: string, password: string):Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();
    
    // First try Firebase Auth if configured
    if (isFirebaseConfigured && auth) {
      try {
        const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const registered = this.findUserByEmail(cleanEmail);
        const user: AuthUser = {
          id: res.user.uid,
          email: res.user.email || cleanEmail,
          name: res.user.displayName || registered?.name || cleanEmail.split('@')[0],
          company: registered?.company || 'My Company',
          role: registered?.role || 'admin',
          createdAt: registered?.createdAt || new Date().toISOString(),
        };
        this.setCurrentUser(user);
        return user;
      } catch (fbError) {
        console.warn('Firebase signIn failed, evaluating local credentials directory:', fbError);
      }
    }

    // Local / Offline authentication fallback
    const users = this.getAllUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    
    if (!existing) {
      // Allow seamless first demo user sign-in or throw
      if (password.length >= 6) {
        const newUser: AuthUser = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          company: 'My Company',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        this.saveUserToDirectory(newUser, password);
        this.setCurrentUser(newUser);
        return newUser;
      }
      throw new Error('User not found. Please sign up first.');
    }

    // Verify stored password hash
    const isValid = existing.passwordHash === this.hashPassword(password);
    if (!isValid && existing.passwordHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    const authUser: AuthUser = {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      company: existing.company,
      role: existing.role || 'admin',
      phone: existing.phone,
      createdAt: existing.createdAt,
    };

    this.setCurrentUser(authUser);
    return authUser;
  }

  public async signUp(email: string, password: string, name: string, company?: string): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    let uid = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Create in Firebase if configured
    if (isFirebaseConfigured && auth) {
      try {
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        uid = res.user.uid;
        if (name) {
          await updateProfile(res.user, { displayName: name });
        }
      } catch (fbError: any) {
        console.warn('Firebase createUser error, continuing with local directory registration:', fbError);
        if (fbError.code === 'auth/email-already-in-use') {
          throw new Error('This email is already in use. Please sign in instead.');
        }
      }
    }

    // Check if user already exists in local directory
    const existing = this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    const newUser: AuthUser = {
      id: uid,
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      company: company?.trim() || 'My Studio',
      role: 'admin', // First creator is admin
      createdAt: new Date().toISOString(),
    };

    this.saveUserToDirectory(newUser, password);
    this.setCurrentUser(newUser);
    return newUser;
  }

  public async signOut(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn('Firebase signout warning:', e);
      }
    }
    this.setCurrentUser(null);
  }

  public async updateUserProfile(updates: Partial<Omit<AuthUser, 'id' | 'email'>>): Promise<AuthUser> {
    if (!this.currentUser) {
      throw new Error('No user is currently signed in.');
    }

    const updatedUser: AuthUser = {
      ...this.currentUser,
      ...updates,
    };

    // Update directory
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      this.saveAllUsers(users);
    }

    this.setCurrentUser(updatedUser);
    return updatedUser;
  }

  // Local user directory helpers
  private findUserByEmail(email: string) {
    const users = this.getAllUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  private getAllUsers(): Array<AuthUser & { passwordHash?: string }> {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(USERS_DIRECTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveAllUsers(users: any[]) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(USERS_DIRECTORY_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save users directory:', e);
    }
  }

  private saveUserToDirectory(user: AuthUser, passwordPlain: string) {
    const users = this.getAllUsers();
    const filtered = users.filter(u => u.email.toLowerCase() !== user.email.toLowerCase());
    filtered.push({
      ...user,
      passwordHash: this.hashPassword(passwordPlain)
    });
    this.saveAllUsers(filtered);
  }

  private hashPassword(plain: string): string {
    // Standard client hash for demo/offline security
    let hash = 0;
    for (let i = 0; i < plain.length; i++) {
      const char = plain.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `h_${Math.abs(hash)}_${plain.length}`;
  }
}

export const authService = new AuthService();
