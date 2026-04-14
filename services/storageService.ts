
// Force Vite cache invalidation - 2026-03-26
import { db, auth } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import { Tire, Vehicle, VehicleBrandModel, VehicleType, FuelType, SystemSettings, TeamMember, StockItem, StockMovement, ModuleType, SystemLog, ServiceOrder, RetreadOrder, UserLevel, TreadPattern, Driver, TireLoan, TrackerSettings, ArrivalAlert, LocationPoint, Collaborator, Branch, Partner, OccurrenceReason, Occurrence, FuelEntry, FuelStation, ServiceClassification, ServiceSector } from '../types';

const INTERNAL_DOMAIN = "@sys.gmcontrol.com";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Gracefully handle "benign" Firestore errors like idle stream timeouts
  // These often happen in iframes or when the tab is idle, and Firestore usually auto-reconnects.
  const isIdleTimeout = 
    errorMessage.includes('CANCELLED') || 
    errorMessage.includes('Disconnecting idle stream') ||
    errorMessage.includes('Timed out waiting for new targets') ||
    (error && typeof error === 'object' && (error as any).code === 1); // Code 1 is CANCELLED in gRPC

  if (isIdleTimeout) {
    // Log as info/debug rather than warn to reduce noise
    console.debug(`[Firestore] Idle stream cleanup (benign): ${errorMessage}`);
    return; // Don't throw for benign timeouts
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: (auth?.currentUser as any)?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj));

const DEFAULT_SETTINGS: SystemSettings = {
  minTreadDepth: 3,
  warningTreadDepth: 5,
  standardPressure: 110,
  maintenanceIntervalKm: 10000,
  alertRadius: 500,
  logoUrl: '',
  defaultMonthlyKm: 10000,
  trailerDailyAverageKm: 0,
  serviceTypes: [],
  savedPoints: []
};

// --- LOCAL DB IMPLEMENTATION (OFFLINE/MOCK LAYER) ---
const localListeners: Record<string, Function[]> = {};

const LocalDB = {
    subscribe: (collection: string, cb: (data: any) => void, defaultVal: any = []) => {
        const key = `gm_local_${collection}`;
        if (!localListeners[key]) localListeners[key] = [];
        
        const wrapper = (data: any) => cb(data);
        localListeners[key].push(wrapper);
        
        try {
            const raw = localStorage.getItem(key);
            const data = raw ? JSON.parse(raw) : defaultVal;
            cb(data);
        } catch (e) {
            console.error(`LocalDB read error for ${key}`, e);
            cb(defaultVal);
        }

        return () => {
            localListeners[key] = localListeners[key].filter(w => w !== wrapper);
        };
    },
    
    notify: (collection: string, data: any) => {
        const key = `gm_local_${collection}`;
        console.log(`[LocalDB] Notifying ${localListeners[key]?.length || 0} listeners for ${collection}`);
        if (localListeners[key]) {
            localListeners[key].forEach(cb => cb(data));
        }
    },

    set: (collection: string, data: any) => {
        const key = `gm_local_${collection}`;
        localStorage.setItem(key, JSON.stringify(data));
        LocalDB.notify(collection, data);
    },
    
    add: (collection: string, item: any) => {
        const key = `gm_local_${collection}`;
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = [...current, item];
        LocalDB.set(collection, updated);
    },
    
    update: (collection: string, id: string, updates: any) => {
        const key = `gm_local_${collection}`;
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = current.map((i: any) => i.id === id ? { ...i, ...updates } : i);
        LocalDB.set(collection, updated);
    },
    
    delete: (collection: string, id: string) => {
        const key = `gm_local_${collection}`;
        const raw = localStorage.getItem(key);
        if (!raw) {
            console.warn(`[LocalDB] No data found for ${key} during delete.`);
            return;
        }
        const current = JSON.parse(raw);
        console.log(`[LocalDB] Deleting from ${collection} with ID:`, id, "Current count:", current.length);
        
        const updated = current.filter((i: any) => {
            if (!i || !i.id) return true;
            // Loose equality and string conversion for maximum compatibility
            return String(i.id) != String(id);
        });
        
        console.log(`[LocalDB] Items after filter: ${updated.length}`);
        if (current.length === updated.length) {
            console.warn(`[LocalDB] ID ${id} not found in ${collection}. IDs present:`, current.map((i: any) => i?.id));
        }
        
        LocalDB.set(collection, updated);
    },

    get: (collection: string, defaultVal: any = []) => {
        const key = `gm_local_${collection}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultVal;
    }
};

const getCurrentUser = () => {
  return (auth && auth.currentUser) || (mockUser ? { uid: mockUser.uid, displayName: mockUser.displayName, email: mockUser.email } : null);
};

export const logActivity = async (orgId: string, action: string, details: string, module: ModuleType = 'TIRES') => {
  const user = getCurrentUser();
  if (!user) return;

  try {
    let userName = (user as any).displayName || (user as any).email || 'Usuário';
    const logEntry: SystemLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      userId: (user as any).uid,
      userName: userName,
      action: action,
      details: details,
      module: module,
      timestamp: new Date().toISOString()
    };
    
    if (mockUser || !db) {
        LocalDB.add(`logs`, logEntry);
    } else {
      try {
        await db.collection("system_logs").doc(logEntry.id).set(sanitize(logEntry));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `system_logs/${logEntry.id}`);
      }
    }
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
};

let mockUser: { uid: string, displayName: string, email: string, isAnonymous: boolean } | null = null;
let authSubscribers: ((user: any) => void)[] = [];

const notifyAuthSubscribers = () => {
    authSubscribers.forEach(cb => cb(mockUser || (auth ? auth.currentUser : null)));
};

export const storageService = {
  login: async (username: string, pass: string) => {
    const cleanUser = username.trim().toLowerCase();
    
    // Hardcoded bypass for immediate access or demo
    const isMockBypass = (cleanUser === 'admin' && pass === 'admin') || (cleanUser === 'demo' && pass === 'demo');

    if (isMockBypass) {
        const uid = cleanUser === 'admin' ? 'mock-admin-id' : 'mock-demo-id';
        const name = cleanUser === 'admin' ? 'Administrador Local' : 'Usuário Demo';
        const email = `${cleanUser}${INTERNAL_DOMAIN}`;
        
        mockUser = {
            uid,
            displayName: name,
            email,
            isAnonymous: false
        };

        // Ensure this mock user exists in LocalDB so data persists correctly linked to them
        let localUsers = LocalDB.get('users') as TeamMember[];
        const now = new Date().toISOString();
        const existingAdminIndex = localUsers.findIndex(u => u.id === uid);

        if (existingAdminIndex >= 0) {
            localUsers[existingAdminIndex] = { ...localUsers[existingAdminIndex], lastLogin: now, role: 'SENIOR' };
            LocalDB.set('users', localUsers);
        } else {
            const adminUser: TeamMember = {
                id: uid,
                name: name,
                username: cleanUser,
                email: email,
                role: 'SENIOR',
                allowedModules: ['TIRES', 'MECHANICAL', 'VEHICLES'],
                permissions: ['view_financial', 'edit_tires', 'delete_records', 'view_reports', 'manage_stock', 'manage_team'],
                createdAt: now,
                lastLogin: now
            };
            LocalDB.add('users', adminUser);
        }

        notifyAuthSubscribers();
        return;
    }

    // Try Firebase Authentication
    if (auth) {
        try {
            const emailToAuth = cleanUser.includes('@') ? cleanUser : `${cleanUser}${INTERNAL_DOMAIN}`;
            const userCred = await auth.signInWithEmailAndPassword(emailToAuth, pass);
            
            if (userCred.user && db) {
               try {
                 await db.collection("users").doc(userCred.user.uid).update({ lastLogin: new Date().toISOString() });
               } catch (error) {
                 // Non-critical error, just log it
                 console.warn("Failed to update lastLogin:", error);
               }
            }
            return;
        } catch (error: any) {
            console.warn("Firebase Login Failed:", error.code);
            // Fallthrough to local check
        }
    }

    // Local DB Fallback
    const localUsers = LocalDB.get('users') as TeamMember[];
    const found = localUsers.find(u => u.username === cleanUser || u.email === cleanUser || u.email === `${cleanUser}${INTERNAL_DOMAIN}`);
    
    if (found) {
        // Validate mock password simply by checking if it matches the username for fallback ease or if it's the "demo" pass
        if (pass === 'demo' || pass === '123456' || pass === 'admin') {
             mockUser = { uid: found.id, displayName: found.name, email: found.email, isAnonymous: false };
             LocalDB.update('users', found.id, { lastLogin: new Date().toISOString() });
             notifyAuthSubscribers();
             return;
        }
    }

    throw new Error("Credenciais inválidas ou usuário não encontrado. Tente 'admin' / 'admin' se for o primeiro acesso.");
  },

  register: async (usernameOrEmail: string, pass: string, name: string, branchId?: string) => {
    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const email = cleanInput.includes('@') ? cleanInput : `${cleanInput}${INTERNAL_DOMAIN}`;
    const username = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;

    // Force local registration if offline or mock user is active
    if (mockUser || cleanInput === 'demo' || cleanInput.endsWith('@demo.com')) {
        const uid = 'mock-' + Date.now();
        const member: TeamMember = {
            id: uid,
            name: name,
            username: username,
            email: email,
            branchId: branchId,
            role: 'SENIOR',
            allowedModules: ['TIRES', 'MECHANICAL', 'VEHICLES'],
            permissions: ['view_financial', 'edit_tires', 'delete_records', 'view_reports', 'manage_stock', 'manage_team'],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        LocalDB.add('users', member);
        mockUser = { uid, displayName: name, email: email, isAnonymous: false };
        notifyAuthSubscribers();
        return;
    }

    // Try Firebase
    if (auth && db) {
        try {
            const userCred = await auth.createUserWithEmailAndPassword(email, pass);
            if (userCred.user) {
                await userCred.user.updateProfile({ displayName: name });
                const member: TeamMember = {
                    id: userCred.user.uid,
                    name: name,
                    username: username,
                    email: email,
                    branchId: branchId,
                    role: 'SENIOR',
                    allowedModules: ['TIRES', 'MECHANICAL', 'VEHICLES'],
                    permissions: ['view_financial', 'edit_tires', 'delete_records', 'view_reports', 'manage_stock', 'manage_team'],
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                await db.collection("users").doc(userCred.user.uid).set(sanitize(member));
                return;
            }
        } catch (error: any) {
            console.warn("Firebase Register Failed, using local fallback:", error.code);
        }
    }

    // Local Fallback for Register
    const uid = 'local-' + Date.now();
    const member: TeamMember = {
        id: uid,
        name: name,
        username: username,
        email: email,
        branchId: branchId,
        role: 'SENIOR',
        allowedModules: ['TIRES', 'MECHANICAL', 'VEHICLES'],
        permissions: ['view_financial', 'edit_tires', 'delete_records', 'view_reports', 'manage_stock', 'manage_team'],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };
    LocalDB.add('users', member);
    mockUser = { uid, displayName: name, email: email, isAnonymous: false };
    notifyAuthSubscribers();
  },

  logout: async () => {
    if (mockUser) {
        mockUser = null;
        notifyAuthSubscribers();
    } else if (auth) {
        await auth.signOut();
    }
  },

  subscribeToAuth: (callback: (user: firebase.User | null) => void) => {
    authSubscribers.push(callback);
    
    if (mockUser) {
        callback(mockUser as any);
    } else if (!auth) {
        callback(null);
    }

    const unsubscribe = auth ? auth.onAuthStateChanged((user) => {
        if (!mockUser) callback(user);
    }) : () => {};
    
    return () => {
        if (auth) unsubscribe();
        authSubscribers = authSubscribers.filter(cb => cb !== callback);
    };
  },

  getUserProfile: async (uid: string): Promise<TeamMember | null> => {
    if (uid === 'mock-admin-id') {
        const localUsers = LocalDB.get('users') as TeamMember[];
        return localUsers.find(u => u.id === uid) || {
            id: 'mock-admin-id',
            name: 'Administrador Local',
            username: 'admin',
            email: 'admin@sys.gmcontrol.com',
            role: 'SENIOR',
            allowedModules: ['TIRES', 'MECHANICAL', 'VEHICLES'],
            permissions: ['view_financial', 'edit_tires', 'delete_records', 'view_reports', 'manage_stock', 'manage_team'],
            createdAt: new Date().toISOString()
        };
    }
    
    try {
      if (db && !uid.startsWith('local-') && !uid.startsWith('mock-')) {
          const doc = await db.collection("users").doc(uid).get();
          if (doc.exists) return doc.data() as TeamMember;
      }
      const localUsers = LocalDB.get('users') as TeamMember[];
      return localUsers.find(u => u.id === uid) || null;
    } catch (error) {
      return null;
    }
  },

  registerTeamMember: async (orgId: string, firstName: string, lastName: string, pass: string, role: UserLevel, modules: ModuleType[], permissions: string[], branchId?: string | null) => {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    let username = baseUsername;
    let email = `${username}${INTERNAL_DOMAIN}`;
    const name = `${firstName} ${lastName}`;
    const now = new Date().toISOString();
    
    // Try Firebase if available, even if we are a mockUser (to allow creating real users)
    if (auth && db) {
        let userCred = null;
        let attempt = 0;
        let currentUsername = username;
        let currentEmail = email;
        
        while (!userCred && attempt < 5) {
            try {
                console.log(`[Firebase] Attempting to register user: ${currentEmail} (Attempt ${attempt + 1})`);
                userCred = await auth.createUserWithEmailAndPassword(currentEmail, pass);
                console.log("[Firebase] User created successfully in Auth:", userCred.user?.uid);
            } catch (e: any) {
                console.error("[Firebase] Registration failed:", e.code, e.message);
                
                const isEmailInUse = e.code === 'auth/email-already-in-use' || (e.message && e.message.includes('auth/email-already-in-use'));
                
                if (isEmailInUse) {
                    attempt++;
                    currentUsername = `${baseUsername}${attempt}`;
                    currentEmail = `${currentUsername}${INTERNAL_DOMAIN}`;
                    console.log(`[Firebase] Email in use, retrying with: ${currentEmail}`);
                } else {
                    // Critical error (e.g. operation-not-allowed, invalid-email, etc.)
                    throw new Error(`Falha no Firebase Auth (${e.code}): ${e.message}. Verifique se o provedor Email/Senha está ativado no Console do Firebase.`);
                }
            }
        }

        if (userCred && userCred.user) {
            try {
                const member: TeamMember = { 
                    id: userCred.user.uid, 
                    name, 
                    username: currentUsername, 
                    email: currentEmail, 
                    role, 
                    allowedModules: modules, 
                    permissions, 
                    createdAt: now,
                    branchId
                };
                console.log("[Firebase] Saving user profile to Firestore...");
                try {
                    await db.collection("users").doc(userCred.user.uid).set(sanitize(member));
                } catch (e) {
                    handleFirestoreError(e, OperationType.WRITE, `users/${userCred.user.uid}`);
                }
                logActivity(orgId, "Criou Usuário", `Cadastrou ${name} (${currentUsername}) no Firebase`, 'TIRES');
                console.log("[Firebase] User profile saved successfully");
                return currentUsername;
            } catch (fsError: any) {
                console.error("[Firebase] Failed to save profile to Firestore:", fsError);
                throw new Error(`Usuário criado no Auth, mas falhou ao salvar no Firestore: ${fsError.message}`);
            }
        }
    }

    // Fallback to LocalDB only if Firebase is not available
    console.warn("[LocalDB] Falling back to LocalDB for user registration");
    const id = (mockUser ? 'mock-' : 'local-') + Date.now();
    const member: TeamMember = { id, name, username, email, role, allowedModules: modules, permissions, createdAt: now, lastLogin: undefined, branchId };
    LocalDB.add(`users`, member);
    return username;
  },

  updateTeamMember: async (orgId: string, id: string, data: Partial<TeamMember>) => {
    if (mockUser || id.startsWith('mock-') || id.startsWith('local-') || !db) { LocalDB.update(`users`, id, data); return; }
    try {
      await db.collection("users").doc(id).update(sanitize(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  },

  subscribeToTeam: (orgId: string, callback: (members: TeamMember[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`users`, callback);
    return db.collection("users").onSnapshot((snapshot) => {
      const members: TeamMember[] = [];
      snapshot.forEach((doc) => members.push(doc.data() as TeamMember));
      callback(members);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "users"));
  },

  deleteTeamMember: async (orgId: string, id: string) => {
    if (mockUser || id.startsWith('mock-') || id.startsWith('local-') || !db) { LocalDB.delete(`users`, id); return; }
    try {
      await db.collection("users").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  },

  getPaginatedTires: async (orgId: string, limitCount: number = 50, lastDoc?: any): Promise<{ data: Tire[], lastDoc: any }> => {
    if (mockUser || !db) return { data: LocalDB.get(`tires`, []).slice(0, limitCount), lastDoc: null };
    try {
      let query = db.collection("tires").orderBy("fireNumber").limit(limitCount);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      return {
        data: snapshot.docs.map(doc => doc.data() as Tire),
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "tires_paginated");
      return { data: [], lastDoc: null };
    }
  },

  getPaginatedVehicles: async (orgId: string, limitCount: number = 50, lastDoc?: any): Promise<{ data: Vehicle[], lastDoc: any }> => {
    if (mockUser || !db) return { data: LocalDB.get(`vehicles`, []).slice(0, limitCount), lastDoc: null };
    try {
      let query = db.collection("vehicles").orderBy("plate").limit(limitCount);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      return {
        data: snapshot.docs.map(doc => doc.data() as Vehicle),
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "vehicles_paginated");
      return { data: [], lastDoc: null };
    }
  },

  getPaginatedServiceOrders: async (orgId: string, limitCount: number = 50, lastDoc?: any): Promise<{ data: ServiceOrder[], lastDoc: any }> => {
    if (mockUser || !db) return { data: LocalDB.get(`service_orders`, []).sort((a:any,b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limitCount), lastDoc: null };
    try {
      let query = db.collection("service_orders").orderBy("createdAt", "desc").limit(limitCount);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      return {
        data: snapshot.docs.map(doc => doc.data() as ServiceOrder),
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "service_orders_paginated");
      return { data: [], lastDoc: null };
    }
  },

  getPaginatedFuelEntries: async (orgId: string, limitCount: number = 50, lastDoc?: any): Promise<{ data: FuelEntry[], lastDoc: any }> => {
    if (mockUser || !db) return { data: LocalDB.get(`fuel_entries`, []).sort((a:any,b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limitCount), lastDoc: null };
    try {
      let query = db.collection("fuel_entries").orderBy("date", "desc").limit(limitCount);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      return {
        data: snapshot.docs.map(doc => doc.data() as FuelEntry),
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "fuel_entries_paginated");
      return { data: [], lastDoc: null };
    }
  },

  subscribeToTires: (orgId: string, callback: (tires: Tire[]) => void, limitCount: number = 100) => {
    if (mockUser || !db) return LocalDB.subscribe(`tires`, callback);
    return db.collection("tires").limit(limitCount).onSnapshot((snapshot) => {
      const tires: Tire[] = [];
      snapshot.forEach((doc) => tires.push(doc.data() as Tire));
      callback(tires);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "tires"));
  },

  addTire: async (orgId: string, tire: Tire) => {
    if (mockUser || !db) { LocalDB.add(`tires`, tire); logActivity(orgId, "Novo Pneu", `Cadastrou pneu ${tire.fireNumber}`, 'TIRES'); return; }
    try {
      await db.collection("tires").doc(tire.id).set(sanitize(tire));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tires/${tire.id}`);
    }
    logActivity(orgId, "Novo Pneu", `Cadastrou pneu ${tire.fireNumber}`, 'TIRES');
  },

  updateTire: async (orgId: string, tire: Tire) => {
    const lastHistory = tire.history && tire.history.length > 0 ? tire.history[tire.history.length - 1] : null;
    const details = lastHistory ? lastHistory.details : 'Dados atualizados';
    if (mockUser || !db) { LocalDB.update(`tires`, tire.id, tire); logActivity(orgId, "Atualizou Pneu", `${tire.fireNumber} - ${details}`, 'TIRES'); return; }
    try {
      await db.collection("tires").doc(tire.id).set(sanitize(tire), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tires/${tire.id}`);
    }
    logActivity(orgId, "Atualizou Pneu", `${tire.fireNumber} - ${details}`, 'TIRES');
  },

  updateTireBatch: async (orgId: string, updates: Partial<Tire>[]) => {
    if (mockUser || !db) {
        updates.forEach(u => { if(u.id) LocalDB.update(`tires`, u.id, u); });
        return;
    }
    try {
      const batch = db.batch();
      updates.forEach(update => {
        if(update.id) {
          const ref = db.collection("tires").doc(update.id);
          batch.update(ref, sanitize(update));
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "tires_batch");
    }
  },

  deleteTire: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`tires`, id); logActivity(orgId, "Excluiu Pneu", `ID: ${id}`, 'TIRES'); return; }
    try {
      await db.collection("tires").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tires/${id}`);
    }
    logActivity(orgId, "Excluiu Pneu", `ID: ${id}`, 'TIRES');
  },

  subscribeToVehicles: (orgId: string, callback: (vehicles: Vehicle[]) => void, limitCount: number = 100) => {
    if (mockUser || !db) return LocalDB.subscribe(`vehicles`, callback);
    return db.collection("vehicles").limit(limitCount).onSnapshot((snapshot) => {
      const vehicles: Vehicle[] = [];
      snapshot.forEach((doc) => vehicles.push(doc.data() as Vehicle));
      callback(vehicles);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "vehicles"));
  },

  addVehicle: async (orgId: string, vehicle: Vehicle) => {
    if (mockUser || !db) { LocalDB.add(`vehicles`, vehicle); logActivity(orgId, "Novo Veículo", `Placa: ${vehicle.plate}`, 'TIRES'); return; }
    try {
      await db.collection("vehicles").doc(vehicle.id).set(sanitize(vehicle));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vehicles/${vehicle.id}`);
    }
    logActivity(orgId, "Novo Veículo", `Placa: ${vehicle.plate}`, 'TIRES');
  },

  updateVehicle: async (orgId: string, vehicle: Vehicle) => {
    const updates = { ...vehicle, lastAutoUpdateDate: new Date().toISOString() };
    if (mockUser || !db) { LocalDB.update(`vehicles`, vehicle.id, updates); logActivity(orgId, "Editou Veículo", `Placa: ${vehicle.plate}`, 'TIRES'); return; }
    try {
      await db.collection("vehicles").doc(vehicle.id).set(sanitize(updates), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicles/${vehicle.id}`);
    }
    logActivity(orgId, "Editou Veículo", `Placa: ${vehicle.plate}`, 'TIRES');
  },

  deleteVehicle: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`vehicles`, id); logActivity(orgId, "Excluiu Veículo", `ID: ${id}`, 'TIRES'); return; }
    try {
      await db.collection("vehicles").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicles/${id}`);
    }
    logActivity(orgId, "Excluiu Veículo", `ID: ${id}`, 'TIRES');
  },

  subscribeToVehicleBrandModels: (orgId: string, callback: (models: VehicleBrandModel[]) => void) => {
    const seedIfEmpty = async (models: VehicleBrandModel[]) => {
      if (models.length === 0) {
        console.log("Seeding default brand models...");
        const defaults: VehicleBrandModel[] = [
          { id: 'v1', brand: 'VOLVO', model: 'FH 540', type: 'CAVALO', axles: 3, oilChangeInterval: 50000, oilLiters: 35 },
          { id: 's1', brand: 'SCANIA', model: 'R 450', type: 'CAVALO', axles: 3, oilChangeInterval: 40000, oilLiters: 32 },
          { id: 'm1', brand: 'MERCEDES-BENZ', model: 'ACTROS 2651', type: 'CAVALO', axles: 3, oilChangeInterval: 45000, oilLiters: 34 },
          { id: 'r1', brand: 'RANDON', model: 'GRANEIRA', type: 'CARRETA', axles: 3 },
          { id: 'l1', brand: 'LIBRELATO', model: 'BASCULANTE', type: 'CARRETA', axles: 3 }
        ];
        
        for (const m of defaults) {
          if (mockUser || !db) {
            LocalDB.add(`vehicleBrandModels`, m);
          } else {
            await db.collection("vehicleBrandModels").doc(m.id).set(sanitize(m));
          }
        }
      }
    };

    if (mockUser || !db) {
      return LocalDB.subscribe(`vehicleBrandModels`, (data) => {
        seedIfEmpty(data);
        callback(data);
      });
    }
    
    return db.collection("vehicleBrandModels").onSnapshot((snapshot) => {
      const models: VehicleBrandModel[] = [];
      snapshot.forEach((doc) => models.push(doc.data() as VehicleBrandModel));
      seedIfEmpty(models);
      callback(models);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "vehicleBrandModels"));
  },

  addVehicleBrandModel: async (orgId: string, model: VehicleBrandModel) => {
    if (mockUser || !db) { LocalDB.add(`vehicleBrandModels`, model); logActivity(orgId, "Nova Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES'); return; }
    try {
      await db.collection("vehicleBrandModels").doc(model.id).set(sanitize(model));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vehicleBrandModels/${model.id}`);
    }
    logActivity(orgId, "Nova Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES');
  },

  updateVehicleBrandModel: async (orgId: string, model: VehicleBrandModel) => {
    if (mockUser || !db) { LocalDB.update(`vehicleBrandModels`, model.id, model); logActivity(orgId, "Editou Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES'); return; }
    try {
      await db.collection("vehicleBrandModels").doc(model.id).set(sanitize(model), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicleBrandModels/${model.id}`);
    }
    logActivity(orgId, "Editou Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES');
  },

  deleteVehicleBrandModel: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`vehicleBrandModels`, id); logActivity(orgId, "Excluiu Marca/Modelo", `ID: ${id}`, 'TIRES'); return; }
    try {
      await db.collection("vehicleBrandModels").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicleBrandModels/${id}`);
    }
    logActivity(orgId, "Excluiu Marca/Modelo", `ID: ${id}`, 'TIRES');
  },

  getVehicleTypes: async (orgId: string): Promise<VehicleType[]> => {
    if (mockUser || !db) return LocalDB.get(`vehicleTypes`, []);
    try {
      const snapshot = await db.collection("vehicleTypes").get();
      return snapshot.docs.map(doc => doc.data() as VehicleType);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "vehicleTypes");
      return [];
    }
  },

  subscribeToVehicleTypes: (orgId: string, callback: (types: VehicleType[]) => void) => {
    const seedIfEmpty = async (types: VehicleType[]) => {
      if (types.length === 0) {
        console.log("Seeding default vehicle types...");
        const defaults: VehicleType[] = [
          { id: 'vt1', name: 'CAVALO', defaultAxles: 3, steerAxlesCount: 1 },
          { id: 'vt2', name: 'CARRETA', defaultAxles: 3, steerAxlesCount: 0 },
          { id: 'vt3', name: 'BI-TRUCK', defaultAxles: 4, steerAxlesCount: 2 },
          { id: 'vt4', name: 'BITRUCK', defaultAxles: 4, steerAxlesCount: 2 },
          { id: 'vt5', name: '3/4', defaultAxles: 2, steerAxlesCount: 1 }
        ];
        
        for (const t of defaults) {
          if (mockUser || !db) {
            LocalDB.add(`vehicleTypes`, t);
          } else {
            await db.collection("vehicleTypes").doc(t.id).set(sanitize(t));
          }
        }
      }
    };

    if (mockUser || !db) {
      return LocalDB.subscribe(`vehicleTypes`, (data) => {
        seedIfEmpty(data);
        callback(data);
      });
    }
    
    return db.collection("vehicleTypes").onSnapshot((snapshot) => {
      const types: VehicleType[] = [];
      snapshot.forEach((doc) => types.push(doc.data() as VehicleType));
      seedIfEmpty(types);
      callback(types);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "vehicleTypes"));
  },

  addVehicleType: async (orgId: string, type: VehicleType) => {
    if (mockUser || !db) { LocalDB.add(`vehicleTypes`, type); logActivity(orgId, "Novo Tipo de Veículo", `${type.name}`, 'TIRES'); return; }
    try {
      await db.collection("vehicleTypes").doc(type.id).set(sanitize(type));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vehicleTypes/${type.id}`);
    }
    logActivity(orgId, "Novo Tipo de Veículo", `${type.name}`, 'TIRES');
  },

  updateVehicleType: async (orgId: string, type: VehicleType) => {
    if (mockUser || !db) { LocalDB.update(`vehicleTypes`, type.id, type); logActivity(orgId, "Editou Tipo de Veículo", `${type.name}`, 'TIRES'); return; }
    try {
      await db.collection("vehicleTypes").doc(type.id).set(sanitize(type), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicleTypes/${type.id}`);
    }
    logActivity(orgId, "Editou Tipo de Veículo", `${type.name}`, 'TIRES');
  },

  deleteVehicleType: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`vehicleTypes`, id); logActivity(orgId, "Excluiu Tipo de Veículo", `ID: ${id}`, 'TIRES'); return; }
    try {
      await db.collection("vehicleTypes").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicleTypes/${id}`);
    }
    logActivity(orgId, "Excluiu Tipo de Veículo", `ID: ${id}`, 'TIRES');
  },

  // --- FUEL TYPES ---
  getFuelTypes: async (orgId: string): Promise<FuelType[]> => {
    if (mockUser || !db) return LocalDB.get(`fuelTypes`, []);
    try {
      const snapshot = await db.collection("fuelTypes").get();
      return snapshot.docs.map(doc => doc.data() as FuelType);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "fuelTypes");
      return [];
    }
  },

  subscribeToFuelTypes: (orgId: string, callback: (types: FuelType[]) => void) => {
    const seedIfEmpty = async (types: FuelType[]) => {
      if (types.length === 0) {
        const defaults: FuelType[] = [
          { id: 'diesel-s10', name: 'Diesel S10', description: 'Diesel com baixo teor de enxofre' },
          { id: 'diesel-s500', name: 'Diesel S500', description: 'Diesel comum' },
          { id: 'gasolina', name: 'Gasolina', description: 'Gasolina comum' },
          { id: 'etanol', name: 'Etanol', description: 'Álcool combustível' },
          { id: 'arla-32', name: 'ARLA 32', description: 'Agente Redutor Líquido Automotivo' }
        ];
        for (const t of defaults) {
          if (mockUser || !db) {
            LocalDB.add(`fuelTypes`, t);
          } else {
            await db.collection("fuelTypes").doc(t.id).set(sanitize(t));
          }
        }
      }
    };

    if (mockUser || !db) {
      return LocalDB.subscribe(`fuelTypes`, (data) => {
        seedIfEmpty(data);
        callback(data);
      });
    }

    return db.collection("fuelTypes").onSnapshot((snapshot) => {
      const types: FuelType[] = [];
      snapshot.forEach((doc) => types.push(doc.data() as FuelType));
      seedIfEmpty(types);
      callback(types);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `fuelTypes`));
  },

  addFuelType: async (orgId: string, type: FuelType) => {
    if (mockUser || !db) { LocalDB.add(`fuelTypes`, type); logActivity(orgId, "Adicionou Tipo de Combustível", `${type.name}`, 'FUEL'); return; }
    try {
      await db.collection("fuelTypes").doc(type.id).set(sanitize(type));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `fuelTypes/${type.id}`);
    }
    logActivity(orgId, "Adicionou Tipo de Combustível", `${type.name}`, 'FUEL');
  },

  updateFuelType: async (orgId: string, type: FuelType) => {
    if (mockUser || !db) { LocalDB.update(`fuelTypes`, type.id, type); logActivity(orgId, "Editou Tipo de Combustível", `${type.name}`, 'FUEL'); return; }
    try {
      await db.collection("fuelTypes").doc(type.id).update(sanitize(type));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `fuelTypes/${type.id}`);
    }
    logActivity(orgId, "Editou Tipo de Combustível", `${type.name}`, 'FUEL');
  },

  deleteFuelType: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`fuelTypes`, id); logActivity(orgId, "Excluiu Tipo de Combustível", `ID: ${id}`, 'FUEL'); return; }
    try {
      await db.collection("fuelTypes").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fuelTypes/${id}`);
    }
    logActivity(orgId, "Excluiu Tipo de Combustível", `ID: ${id}`, 'FUEL');
  },

  updateVehicleBatch: async (orgId: string, updates: any[]) => {
    if (mockUser || !db) {
        updates.forEach(u => { if(u.id) LocalDB.update(`vehicles`, u.id, u); });
        return;
    }
    try {
      const batch = db.batch();
      updates.forEach(update => {
        if(update.id) {
          const ref = db.collection("vehicles").doc(update.id);
          batch.update(ref, sanitize(update));
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "vehicles_batch");
    }
  },

  checkDailyTrailerIncrement: async (orgId: string, vehicles: Vehicle[], settings: SystemSettings) => {
      if (!settings.trailerDailyAverageKm || settings.trailerDailyAverageKm <= 0) return;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const updates: any[] = [];
      
      vehicles.forEach(v => {
          if (v.type === 'CARRETA') {
              let lastDate = today;
              if (v.lastAutoUpdateDate) {
                  lastDate = new Date(v.lastAutoUpdateDate);
                  lastDate.setHours(0,0,0,0);
              } else {
                  updates.push({ id: v.id, lastAutoUpdateDate: new Date().toISOString() });
                  return; 
              }

              const diffTime = Math.abs(today.getTime() - lastDate.getTime());
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 

              if (diffDays > 0) {
                  const kmToAdd = diffDays * (settings.trailerDailyAverageKm || 0);
                  updates.push({
                      id: v.id,
                      odometer: (v.odometer || 0) + kmToAdd,
                      lastAutoUpdateDate: new Date().toISOString()
                  });
              }
          }
      });

      if (updates.length > 0) {
          await storageService.updateVehicleBatch(orgId, updates);
      }
  },

  exportData: (tires: Tire[], vehicles: Vehicle[]) => {
    const data = { tires, vehicles, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gm_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  importDataBatch: async (orgId: string, tires: Tire[], vehicles: Vehicle[]) => {
    if (mockUser || !db) {
        tires.forEach(t => LocalDB.add(`tires`, t));
        vehicles.forEach(v => LocalDB.add(`vehicles`, v));
        return;
    }
    try {
      const batch = db.batch();
      tires.forEach(t => {
          const ref = db.collection("tires").doc(t.id);
          batch.set(ref, sanitize(t));
      });
      vehicles.forEach(v => {
          const ref = db.collection("vehicles").doc(v.id);
          batch.set(ref, sanitize(v));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "import_batch");
    }
    logActivity(orgId, "Importação", `Importou ${tires.length} pneus e ${vehicles.length} veículos`, 'TIRES');
  },

  subscribeToRetreaders: (orgId: string, callback: (partners: {id: string, name: string}[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`retreaders`, callback, []);
    return db.collection("retreaders").orderBy("name").onSnapshot((snapshot) => {
        const partners: {id: string, name: string}[] = [];
        snapshot.forEach(doc => partners.push({ id: doc.id, ...doc.data() } as any));
        callback(partners);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "retreaders"));
  },

  addRetreader: async (orgId: string, name: string) => {
      const id = Date.now().toString();
      if (mockUser || !db) { LocalDB.add(`retreaders`, { id, name }); return; }
      try {
        await db.collection("retreaders").doc(id).set({ name });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `retreaders/${id}`);
      }
  },

  deleteRetreader: async (orgId: string, id: string) => {
      if (mockUser || !db) { LocalDB.delete(`retreaders`, id); return; }
      try {
        await db.collection("retreaders").doc(id).delete();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `retreaders/${id}`);
      }
  },

  subscribeToTreadPatterns: (orgId: string, callback: (patterns: TreadPattern[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`tread_patterns`, callback, []);
    return db.collection("tread_patterns").orderBy("name").onSnapshot((snapshot) => {
        const patterns: TreadPattern[] = [];
        snapshot.forEach(doc => patterns.push({ id: doc.id, ...doc.data() } as TreadPattern));
        callback(patterns);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "tread_patterns"));
  },

  subscribeToPartners: (orgId: string, callback: (partners: Partner[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`partners`, callback, []);
    return db.collection("partners").orderBy("name").onSnapshot((snapshot) => {
        const partners: Partner[] = [];
        snapshot.forEach(doc => partners.push({ id: doc.id, ...doc.data() } as Partner));
        callback(partners);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "partners"));
  },

  addPartner: async (orgId: string, partner: Partner) => {
      if (mockUser || !db) { LocalDB.add(`partners`, partner); return; }
      try {
        await db.collection("partners").doc(partner.id).set(sanitize(partner));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `partners/${partner.id}`);
      }
  },

  updatePartner: async (orgId: string, partner: Partner) => {
      if (mockUser || !db) { LocalDB.update(`partners`, partner.id, partner); return; }
      try {
        await db.collection("partners").doc(partner.id).set(sanitize(partner), { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `partners/${partner.id}`);
      }
  },

  deletePartner: async (orgId: string, id: string) => {
      if (mockUser || !db) { LocalDB.delete(`partners`, id); return; }
      try {
        await db.collection("partners").doc(id).delete();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `partners/${id}`);
      }
  },

  addTreadPattern: async (orgId: string, pattern: Omit<TreadPattern, 'id'>) => {
      const id = Date.now().toString();
      if (mockUser || !db) { LocalDB.add(`tread_patterns`, { id, ...pattern }); return; }
      try {
        await db.collection("tread_patterns").doc(id).set(sanitize(pattern));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `tread_patterns/${id}`);
      }
  },

  updateTreadPattern: async (orgId: string, id: string, updates: Partial<TreadPattern>) => {
      if (mockUser || !db) { LocalDB.update(`tread_patterns`, id, updates); return; }
      try {
        await db.collection("tread_patterns").doc(id).update(sanitize(updates));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tread_patterns/${id}`);
      }
  },

  deleteTreadPattern: async (orgId: string, id: string) => {
      if (mockUser || !db) { LocalDB.delete(`tread_patterns`, id); return; }
      try {
        await db.collection("tread_patterns").doc(id).delete();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tread_patterns/${id}`);
      }
  },

  subscribeToServiceOrders: (orgId: string, callback: (orders: ServiceOrder[]) => void, limitCount: number = 50) => {
    if (mockUser || !db) return LocalDB.subscribe(`service_orders`, (data) => callback(data.sort((a:any,b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
    return db.collection("service_orders").orderBy("createdAt", "desc").limit(limitCount).onSnapshot(snapshot => {
      const orders: ServiceOrder[] = [];
      snapshot.forEach(doc => orders.push(doc.data() as ServiceOrder));
      callback(orders);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "service_orders"));
  },

  addServiceOrder: async (orgId: string, order: ServiceOrder) => {
    if (mockUser || !db) { LocalDB.add(`service_orders`, order); return; }
    try {
      await db.collection("service_orders").doc(order.id).set(sanitize(order));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `service_orders/${order.id}`);
    }
  },

  updateServiceOrder: async (orgId: string, orderId: string, updates: Partial<ServiceOrder>) => {
    if (mockUser || !db) { LocalDB.update(`service_orders`, orderId, updates); return; }
    try {
      await db.collection("service_orders").doc(orderId).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `service_orders/${orderId}`);
    }
  },

  updateServiceOrderBatch: async (orgId: string, updates: { id: string, updates: Partial<ServiceOrder> }[]) => {
    if (mockUser || !db) {
      updates.forEach(u => LocalDB.update(`service_orders`, u.id, u.updates));
      return;
    }
    try {
      const batch = db.batch();
      updates.forEach(u => {
        const ref = db.collection("service_orders").doc(u.id);
        batch.update(ref, sanitize(u.updates));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "service_orders_batch");
    }
  },

  subscribeToMaintenancePlans: (orgId: string, callback: (plans: import('../types').MaintenancePlan[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`maintenance_plans`, callback);
    return db.collection("maintenance_plans").onSnapshot(snapshot => {
      const plans: import('../types').MaintenancePlan[] = [];
      snapshot.forEach(doc => plans.push(doc.data() as import('../types').MaintenancePlan));
      callback(plans);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "maintenance_plans"));
  },

  addMaintenancePlan: async (orgId: string, plan: import('../types').MaintenancePlan) => {
    if (mockUser || !db) { LocalDB.add(`maintenance_plans`, plan); return; }
    try {
      await db.collection("maintenance_plans").doc(plan.id).set(sanitize(plan));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `maintenance_plans/${plan.id}`);
    }
  },

  updateMaintenancePlan: async (orgId: string, planId: string, updates: Partial<import('../types').MaintenancePlan>) => {
    if (mockUser || !db) { LocalDB.update(`maintenance_plans`, planId, updates); return; }
    try {
      await db.collection("maintenance_plans").doc(planId).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `maintenance_plans/${planId}`);
    }
  },

  deleteMaintenancePlan: async (orgId: string, planId: string) => {
    if (mockUser || !db) { LocalDB.delete(`maintenance_plans`, planId); return; }
    try {
      await db.collection("maintenance_plans").doc(planId).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `maintenance_plans/${planId}`);
    }
  },

  subscribeToMaintenanceSchedules: (orgId: string, callback: (schedules: import('../types').MaintenanceSchedule[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`maintenance_schedules`, callback);
    return db.collection("maintenance_schedules").onSnapshot(snapshot => {
      const schedules: import('../types').MaintenanceSchedule[] = [];
      snapshot.forEach(doc => schedules.push(doc.data() as import('../types').MaintenanceSchedule));
      callback(schedules);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "maintenance_schedules"));
  },

  addMaintenanceSchedule: async (orgId: string, schedule: import('../types').MaintenanceSchedule) => {
    if (mockUser || !db) { LocalDB.add(`maintenance_schedules`, schedule); return; }
    try {
      await db.collection("maintenance_schedules").doc(schedule.id).set(sanitize(schedule));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `maintenance_schedules/${schedule.id}`);
    }
  },

  updateMaintenanceSchedule: async (orgId: string, scheduleId: string, updates: Partial<import('../types').MaintenanceSchedule>) => {
    if (mockUser || !db) { LocalDB.update(`maintenance_schedules`, scheduleId, updates); return; }
    try {
      await db.collection("maintenance_schedules").doc(scheduleId).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `maintenance_schedules/${scheduleId}`);
    }
  },

  deleteMaintenanceSchedule: async (orgId: string, scheduleId: string) => {
    if (mockUser || !db) { LocalDB.delete(`maintenance_schedules`, scheduleId); return; }
    try {
      await db.collection("maintenance_schedules").doc(scheduleId).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `maintenance_schedules/${scheduleId}`);
    }
  },

  subscribeToRetreadOrders: (orgId: string, callback: (orders: RetreadOrder[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`retread_orders`, (data) => callback(data.sort((a:any,b:any) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime())));
    return db.collection("retread_orders").orderBy("sentDate", "desc").onSnapshot(snapshot => {
      const orders: RetreadOrder[] = [];
      snapshot.forEach(doc => orders.push(doc.data() as RetreadOrder));
      callback(orders);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "retread_orders"));
  },

  addRetreadOrder: async (orgId: string, order: RetreadOrder) => {
    if (mockUser || !db) { LocalDB.add(`retread_orders`, order); return; }
    try {
      await db.collection("retread_orders").doc(order.id).set(sanitize(order));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `retread_orders/${order.id}`);
    }
  },

  updateRetreadOrder: async (orgId: string, orderId: string, updates: Partial<RetreadOrder>) => {
    if (mockUser || !db) { LocalDB.update(`retread_orders`, orderId, updates); return; }
    try {
      await db.collection("retread_orders").doc(orderId).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `retread_orders/${orderId}`);
    }
  },

  subscribeToStock: (orgId: string, callback: (items: StockItem[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`stock_items`, callback);
    return db.collection("stock_items").orderBy('name').onSnapshot((snapshot) => {
      const items: StockItem[] = [];
      snapshot.forEach((doc) => items.push(doc.data() as StockItem));
      callback(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "stock_items"));
  },

  subscribeToStockMovements: (orgId: string, callback: (movements: StockMovement[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`stock_movements`, (data) => callback(data.sort((a:any,b:any) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime())));
    return db.collection("stock_movements").orderBy('date', 'desc').limit(100).onSnapshot((snapshot) => {
      const movements: StockMovement[] = [];
      snapshot.forEach((doc) => movements.push(doc.data() as StockMovement));
      callback(movements);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "stock_movements"));
  },

  addStockItem: async (orgId: string, item: StockItem) => {
    if (mockUser || !db) { LocalDB.add(`stock_items`, item); return; }
    try {
      await db.collection("stock_items").doc(item.id).set(sanitize(item));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stock_items/${item.id}`);
    }
  },

  updateStockItem: async (orgId: string, item: StockItem) => {
    if (mockUser || !db) { LocalDB.update(`stock_items`, item.id, item); return; }
    try {
      await db.collection("stock_items").doc(item.id).update(sanitize(item));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stock_items/${item.id}`);
    }
  },

  deleteStockItem: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`stock_items`, id); return; }
    try {
      await db.collection("stock_items").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stock_items/${id}`);
    }
  },

  registerStockMovement: async (orgId: string, movement: StockMovement) => {
    if (mockUser || !db) {
        LocalDB.add(`stock_movements`, movement);
        const items = LocalDB.get(`stock_items`) as StockItem[];
        const item = items.find(i => i.id === movement.itemId);
        if (item) {
            let newQty = item.quantity;
            let newAvgCost = item.averageCost;

            if (movement.type === 'ENTRY') {
                const currentTotalValue = item.quantity * item.averageCost;
                const entryTotalValue = movement.quantity * (movement.unitCost || 0);
                newQty = item.quantity + movement.quantity;
                newAvgCost = newQty > 0 ? (currentTotalValue + entryTotalValue) / newQty : 0;
            } else {
                newQty = item.quantity - movement.quantity;
            }

            LocalDB.update(`stock_items`, item.id, { 
                quantity: newQty, 
                averageCost: newAvgCost,
                updatedAt: new Date().toISOString() 
            });
        }
        return;
    }
    
    try {
      await db.collection("stock_movements").add(sanitize(movement));
      const itemRef = db.collection("stock_items").doc(movement.itemId);
      const itemDoc = await itemRef.get();
      if (itemDoc.exists) {
          const item = itemDoc.data() as StockItem;
          let newQty = item.quantity;
          let newAvgCost = item.averageCost;

          if (movement.type === 'ENTRY') {
              const currentTotalValue = item.quantity * item.averageCost;
              const entryTotalValue = movement.quantity * (movement.unitCost || 0);
              newQty = item.quantity + movement.quantity;
              newAvgCost = newQty > 0 ? (currentTotalValue + entryTotalValue) / newQty : 0;
          } else {
              newQty = item.quantity - movement.quantity;
          }

          await itemRef.update({ 
              quantity: newQty, 
              averageCost: newAvgCost,
              updatedAt: new Date().toISOString() 
          });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `stock_movements`);
    }
  },

  subscribeToDrivers: (orgId: string, callback: (drivers: Driver[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`drivers`, callback, []);
    return db.collection("drivers").orderBy("name").onSnapshot((snapshot) => {
      const drivers: Driver[] = [];
      snapshot.forEach((doc) => drivers.push(doc.data() as Driver));
      callback(drivers);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "drivers"));
  },

  addDriver: async (orgId: string, driver: Driver) => {
    if (mockUser || !db) { LocalDB.add(`drivers`, driver); logActivity(orgId, "Novo Motorista", `Cadastrou ${driver.name}`, 'VEHICLES'); return; }
    try {
      await db.collection("drivers").doc(driver.id).set(sanitize(driver));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `drivers/${driver.id}`);
    }
    logActivity(orgId, "Novo Motorista", `Cadastrou ${driver.name}`, 'VEHICLES');
  },

  updateDriver: async (orgId: string, id: string, updates: Partial<Driver>) => {
    if (mockUser || !db) { LocalDB.update(`drivers`, id, updates); return; }
    try {
      await db.collection("drivers").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drivers/${id}`);
    }
  },

  deleteDriver: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`drivers`, id); return; }
    try {
      await db.collection("drivers").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `drivers/${id}`);
    }
  },

  subscribeToCollaborators: (orgId: string, callback: (collaborators: Collaborator[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`collaborators`, callback, []);
    return db.collection("collaborators").orderBy("name").onSnapshot((snapshot) => {
      const collaborators: Collaborator[] = [];
      snapshot.forEach((doc) => collaborators.push(doc.data() as Collaborator));
      callback(collaborators);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "collaborators"));
  },

  addCollaborator: async (orgId: string, collaborator: Collaborator) => {
    if (mockUser || !db) { LocalDB.add(`collaborators`, collaborator); logActivity(orgId, "Novo Colaborador", `Cadastrou ${collaborator.name}`, 'MECHANICAL'); return; }
    try {
      await db.collection("collaborators").doc(collaborator.id).set(sanitize(collaborator));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `collaborators/${collaborator.id}`);
    }
    logActivity(orgId, "Novo Colaborador", `Cadastrou ${collaborator.name}`, 'MECHANICAL');
  },

  updateCollaborator: async (orgId: string, id: string, updates: Partial<Collaborator>) => {
    if (mockUser || !db) { LocalDB.update(`collaborators`, id, updates); return; }
    try {
      await db.collection("collaborators").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `collaborators/${id}`);
    }
  },

  deleteCollaborator: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`collaborators`, id); return; }
    try {
      await db.collection("collaborators").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `collaborators/${id}`);
    }
  },

  subscribeToSettings: (orgId: string, callback: (settings: SystemSettings) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`settings`, callback, DEFAULT_SETTINGS);
    return db.collection("settings").doc("global").onSnapshot((doc) => {
      if (doc.exists) callback({ ...DEFAULT_SETTINGS, ...doc.data() } as SystemSettings);
      else callback(DEFAULT_SETTINGS);
    }, (error) => handleFirestoreError(error, OperationType.GET, "settings/global"));
  },

  saveSettings: async (orgId: string, settings: SystemSettings) => {
    if (mockUser || !db) { LocalDB.set(`settings`, settings); return; }
    try {
      await db.collection("settings").doc("global").set(sanitize(settings));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/global");
    }
  },

  subscribeToTrackerSettings: (orgId: string, callback: (settings: TrackerSettings) => void) => {
    const DEFAULT_TRACKER: TrackerSettings = { 
      apiUrl: 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService', 
      user: 'JOMEDELOGTORREOPENTECH', 
      pass: 'sascar', 
      active: true 
    };
    if (mockUser || !db) return LocalDB.subscribe(`tracker_settings`, callback, DEFAULT_TRACKER);
    return db.collection("settings").doc("tracker").onSnapshot((doc) => {
      if (doc.exists) callback({ ...DEFAULT_TRACKER, ...doc.data() } as TrackerSettings);
      else callback(DEFAULT_TRACKER);
    }, (error) => handleFirestoreError(error, OperationType.GET, "settings/tracker"));
  },

  saveTrackerSettings: async (orgId: string, settings: TrackerSettings) => {
    if (mockUser || !db) { LocalDB.set(`tracker_settings`, settings); return; }
    try {
      await db.collection("settings").doc("tracker").set(sanitize(settings));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/tracker");
    }
  },

  // --- OCCURRENCES ---
  subscribeToOccurrenceReasons: (orgId: string, callback: (reasons: OccurrenceReason[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`occurrence_reasons`, callback, []);
    return db.collection("occurrence_reasons").orderBy("name").onSnapshot((snapshot) => {
      const reasons: OccurrenceReason[] = [];
      snapshot.forEach((doc) => reasons.push(doc.data() as OccurrenceReason));
      callback(reasons);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "occurrence_reasons"));
  },

  addOccurrenceReason: async (orgId: string, reason: OccurrenceReason) => {
    if (mockUser || !db) { LocalDB.add(`occurrence_reasons`, reason); return; }
    try {
      await db.collection("occurrence_reasons").doc(reason.id).set(sanitize(reason));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `occurrence_reasons/${reason.id}`);
    }
  },

  updateOccurrenceReason: async (orgId: string, id: string, updates: Partial<OccurrenceReason>) => {
    if (mockUser || !db) { LocalDB.update(`occurrence_reasons`, id, updates); return; }
    try {
      await db.collection("occurrence_reasons").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `occurrence_reasons/${id}`);
    }
  },

  deleteOccurrenceReason: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`occurrence_reasons`, id); return; }
    try {
      await db.collection("occurrence_reasons").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `occurrence_reasons/${id}`);
    }
  },

  subscribeToOccurrences: (orgId: string, callback: (occurrences: Occurrence[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`occurrences`, (data) => callback(data.sort((a:any,b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())), []);
    return db.collection("occurrences").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      const occurrences: Occurrence[] = [];
      snapshot.forEach((doc) => occurrences.push(doc.data() as Occurrence));
      callback(occurrences);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "occurrences"));
  },

  getOccurrences: async (orgId: string): Promise<Occurrence[]> => {
    if (mockUser || !db) return LocalDB.get(`occurrences`, []);
    try {
      const snapshot = await db.collection("occurrences").orderBy("createdAt", "desc").get();
      return snapshot.docs.map(doc => doc.data() as Occurrence);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "occurrences");
      return [];
    }
  },

  addOccurrence: async (orgId: string, occurrence: Occurrence) => {
    if (mockUser || !db) { LocalDB.add(`occurrences`, occurrence); logActivity(orgId, "Nova Ocorrência", `Veículo: ${occurrence.vehiclePlate} - ${occurrence.reasonName}`, 'VEHICLES'); return; }
    try {
      await db.collection("occurrences").doc(occurrence.id).set(sanitize(occurrence));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `occurrences/${occurrence.id}`);
    }
    logActivity(orgId, "Nova Ocorrência", `Veículo: ${occurrence.vehiclePlate} - ${occurrence.reasonName}`, 'VEHICLES');
  },

  updateOccurrence: async (orgId: string, id: string, updates: Partial<Occurrence>) => {
    if (mockUser || !db) { LocalDB.update(`occurrences`, id, updates); return; }
    try {
      await db.collection("occurrences").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `occurrences/${id}`);
    }
  },

  deleteOccurrence: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`occurrences`, id); return; }
    try {
      await db.collection("occurrences").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `occurrences/${id}`);
    }
  },

  logActivity,

  subscribeToArrivalAlerts: (orgId: string, callback: (alerts: ArrivalAlert[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`arrival_alerts`, callback, []);
    return db.collection("arrival_alerts").onSnapshot((snapshot) => {
      const alerts: ArrivalAlert[] = [];
      snapshot.forEach((doc) => alerts.push({ ...doc.data(), id: doc.id } as ArrivalAlert));
      callback(alerts);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "arrival_alerts"));
  },

  addArrivalAlert: async (orgId: string, alert: ArrivalAlert) => {
    if (mockUser || !db) { LocalDB.add(`arrival_alerts`, alert); return; }
    try {
      await db.collection("arrival_alerts").doc(alert.id).set(sanitize(alert));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `arrival_alerts/${alert.id}`);
    }
  },

  updateArrivalAlert: async (orgId: string, id: string, updates: Partial<ArrivalAlert>) => {
    if (mockUser || !db) { LocalDB.update(`arrival_alerts`, id, updates); return; }
    try {
      await db.collection("arrival_alerts").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `arrival_alerts/${id}`);
    }
  },

  deleteArrivalAlert: async (orgId: string, id: string) => {
    if (mockUser || !db) { 
      LocalDB.delete(`arrival_alerts`, id); 
      return; 
    }
    try {
      await db.collection("arrival_alerts").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `arrival_alerts/${id}`);
    }
  },

  subscribeToTireLoans: (orgId: string, callback: (loans: TireLoan[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`tire_loans`, callback, []);
    return db.collection("tire_loans").onSnapshot((snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as TireLoan));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "tire_loans"));
  },

  addTireLoan: async (orgId: string, loan: TireLoan) => {
    if (mockUser || !db) { LocalDB.add(`tire_loans`, loan); return; }
    try {
      await db.collection("tire_loans").doc(loan.id).set(sanitize(loan));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tire_loans/${loan.id}`);
    }
  },

  updateTireLoan: async (orgId: string, id: string, updates: Partial<TireLoan>) => {
    if (mockUser || !db) { LocalDB.update(`tire_loans`, id, updates); return; }
    try {
      await db.collection("tire_loans").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tire_loans/${id}`);
    }
  },

  getLogsByUser: async (orgId: string, userId: string, limit = 300): Promise<SystemLog[]> => {
     if (mockUser || userId.startsWith('mock-') || !db) {
         const logs = LocalDB.get(`logs`) as SystemLog[];
         return logs.filter(l => l.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
     }
     try {
       try {
         const snapshot = await db.collection("system_logs").where("userId", "==", userId).orderBy("timestamp", "desc").limit(limit).get();
         return snapshot.docs.map(doc => doc.data() as SystemLog);
       } catch (e: any) {
         if (e.message && (e.message.includes("index") || e.message.includes("INDEX"))) {
           const snapshot = await db.collection("system_logs").where("userId", "==", userId).limit(limit).get();
           return snapshot.docs.map(doc => doc.data() as SystemLog)
             .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
         }
         throw e;
       }
     } catch (error) { 
       handleFirestoreError(error, OperationType.LIST, "system_logs_by_user");
       return []; 
     }
  },

  getGlobalLogs: async (orgId: string, limit = 300): Promise<SystemLog[]> => {
    if (mockUser || !db) {
        const logs = LocalDB.get(`logs`) as SystemLog[];
        return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    }
    try {
      try {
        const snapshot = await db.collection("system_logs").orderBy("timestamp", "desc").limit(limit).get();
        return snapshot.docs.map(doc => doc.data() as SystemLog);
      } catch (e: any) {
        // Fallback if index is missing
        if (e.message && (e.message.includes("index") || e.message.includes("INDEX"))) {
           console.warn("Firestore index missing for global system_logs. Falling back to in-memory sort.");
           const snapshot = await db.collection("system_logs").limit(limit).get();
           return snapshot.docs.map(doc => doc.data() as SystemLog)
             .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        throw e;
      }
    } catch (error) { 
      handleFirestoreError(error, OperationType.LIST, "system_logs_global");
      return []; 
    }
  },

  // --- BRANCH MANAGEMENT ---
  subscribeToBranches: (callback: (branches: Branch[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`branches`, callback, []);
    return db.collection("branches").orderBy("name").onSnapshot((snapshot) => {
        const branches: Branch[] = [];
        snapshot.forEach(doc => branches.push(doc.data() as Branch));
        callback(branches);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "branches"));
  },

  addBranch: async (branch: Branch) => {
      if (mockUser || !db) { LocalDB.add(`branches`, branch); return; }
      try {
        await db.collection("branches").doc(branch.id).set(sanitize(branch));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `branches/${branch.id}`);
      }
  },

  updateBranch: async (id: string, data: Partial<Branch>) => {
      if (mockUser || !db) { LocalDB.update(`branches`, id, data); return; }
      try {
        await db.collection("branches").doc(id).update(sanitize(data));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `branches/${id}`);
      }
  },

  deleteBranch: async (id: string) => {
      if (mockUser || !db) { LocalDB.delete(`branches`, id); return; }
      try {
        await db.collection("branches").doc(id).delete();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `branches/${id}`);
      }
  },

  // --- FUEL MANAGEMENT ---
  subscribeToFuelEntries: (orgId: string, callback: (entries: FuelEntry[]) => void, limitCount: number = 50) => {
    if (mockUser || !db) return LocalDB.subscribe(`fuel_entries`, (data) => callback(data.sort((a:any,b:any) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime())), []);
    return db.collection("fuel_entries").orderBy("date", "desc").limit(limitCount).onSnapshot((snapshot) => {
      const entries: FuelEntry[] = [];
      snapshot.forEach((doc) => entries.push(doc.data() as FuelEntry));
      callback(entries);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "fuel_entries"));
  },

  getFuelEntries: async (orgId: string): Promise<FuelEntry[]> => {
    if (mockUser || !db) return LocalDB.get(`fuel_entries`, []);
    try {
      const snapshot = await db.collection("fuel_entries").orderBy("date", "desc").get();
      return snapshot.docs.map(doc => doc.data() as FuelEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "fuel_entries");
      return [];
    }
  },

  addFuelEntry: async (orgId: string, entry: FuelEntry) => {
    if (mockUser || !db) { LocalDB.add(`fuel_entries`, entry); logActivity(orgId, "Novo Abastecimento", `Veículo: ${entry.vehiclePlate} - ${entry.liters}L`, 'VEHICLES'); return; }
    try {
      await db.collection("fuel_entries").doc(entry.id).set(sanitize(entry));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `fuel_entries/${entry.id}`);
    }
    logActivity(orgId, "Novo Abastecimento", `Veículo: ${entry.vehiclePlate} - ${entry.liters}L`, 'VEHICLES');
  },

  updateFuelEntry: async (orgId: string, id: string, updates: Partial<FuelEntry>) => {
    if (mockUser || !db) { LocalDB.update(`fuel_entries`, id, updates); return; }
    try {
      await db.collection("fuel_entries").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `fuel_entries/${id}`);
    }
  },

  deleteFuelEntry: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`fuel_entries`, id); return; }
    try {
      await db.collection("fuel_entries").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fuel_entries/${id}`);
    }
  },

  // --- FUEL STATION MANAGEMENT ---
  subscribeToFuelStations: (callback: (stations: FuelStation[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`fuel_stations`, (data) => callback(data.sort((a:any,b:any) => a.name.localeCompare(b.name))), []);
    return db.collection("fuel_stations").orderBy("name").onSnapshot((snapshot) => {
      const stations: FuelStation[] = [];
      snapshot.forEach((doc) => stations.push(doc.data() as FuelStation));
      callback(stations);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "fuel_stations"));
  },

  addFuelStation: async (orgId: string, station: FuelStation) => {
    if (mockUser || !db) { LocalDB.add(`fuel_stations`, station); logActivity(orgId, "Novo Posto", `Posto: ${station.name} - CNPJ: ${station.cnpj}`, 'VEHICLES'); return; }
    try {
      await db.collection("fuel_stations").doc(station.id).set(sanitize(station));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `fuel_stations/${station.id}`);
    }
    logActivity(orgId, "Novo Posto", `Posto: ${station.name} - CNPJ: ${station.cnpj}`, 'VEHICLES');
  },

  updateFuelStation: async (orgId: string, id: string, updates: Partial<FuelStation>) => {
    if (mockUser || !db) { LocalDB.update(`fuel_stations`, id, updates); return; }
    try {
      await db.collection("fuel_stations").doc(id).update(sanitize(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `fuel_stations/${id}`);
    }
  },

  deleteFuelStation: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`fuel_stations`, id); return; }
    try {
      await db.collection("fuel_stations").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fuel_stations/${id}`);
    }
  },

  // --- SERVICE CLASSIFICATION ---
  getClassifications: async (orgId: string): Promise<ServiceClassification[]> => {
    if (mockUser || !db) return LocalDB.get(`classifications`, []);
    try {
      const snapshot = await db.collection("classifications").get();
      return snapshot.docs.map(doc => doc.data() as ServiceClassification);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "classifications");
      return [];
    }
  },

  addClassification: async (orgId: string, data: Omit<ServiceClassification, 'id'>) => {
    const id = Date.now().toString();
    const item = { ...data, id };
    if (mockUser || !db) { LocalDB.add(`classifications`, item); return; }
    try {
      await db.collection("classifications").doc(id).set(sanitize(item));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `classifications/${id}`);
    }
  },

  updateClassification: async (orgId: string, id: string, data: Partial<ServiceClassification>) => {
    if (mockUser || !db) { LocalDB.update(`classifications`, id, data); return; }
    try {
      await db.collection("classifications").doc(id).update(sanitize(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classifications/${id}`);
    }
  },

  deleteClassification: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`classifications`, id); return; }
    try {
      await db.collection("classifications").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classifications/${id}`);
    }
  },

  // --- SERVICE SECTOR ---
  getSectors: async (orgId: string): Promise<ServiceSector[]> => {
    if (mockUser || !db) return LocalDB.get(`sectors`, []);
    try {
      const snapshot = await db.collection("sectors").get();
      return snapshot.docs.map(doc => doc.data() as ServiceSector);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "sectors");
      return [];
    }
  },

  addSector: async (orgId: string, data: Omit<ServiceSector, 'id'>) => {
    const id = Date.now().toString();
    const item = { ...data, id };
    if (mockUser || !db) { LocalDB.add(`sectors`, item); return; }
    try {
      await db.collection("sectors").doc(id).set(sanitize(item));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `sectors/${id}`);
    }
  },

  updateSector: async (orgId: string, id: string, data: Partial<ServiceSector>) => {
    if (mockUser || !db) { LocalDB.update(`sectors`, id, data); return; }
    try {
      await db.collection("sectors").doc(id).update(sanitize(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sectors/${id}`);
    }
  },

  deleteSector: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`sectors`, id); return; }
    try {
      await db.collection("sectors").doc(id).delete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sectors/${id}`);
    }
  },

  subscribeToClassifications: (onUpdate: (data: ServiceClassification[]) => void) => {
    if (mockUser || !db) {
        const interval = setInterval(() => {
            onUpdate(LocalDB.get(`classifications`, []));
        }, 1000);
        return () => clearInterval(interval);
    }
    return db.collection("classifications").onSnapshot(
        (snapshot) => onUpdate(snapshot.docs.map(doc => doc.data() as ServiceClassification)),
        (error) => handleFirestoreError(error, OperationType.LIST, "classifications")
    );
  },

  subscribeToSectors: (onUpdate: (data: ServiceSector[]) => void) => {
    if (mockUser || !db) {
        const interval = setInterval(() => {
            onUpdate(LocalDB.get(`sectors`, []));
        }, 1000);
        return () => clearInterval(interval);
    }
    return db.collection("sectors").onSnapshot(
        (snapshot) => onUpdate(snapshot.docs.map(doc => doc.data() as ServiceSector)),
        (error) => handleFirestoreError(error, OperationType.LIST, "sectors")
    );
  },

  resetData: async (orgId: string) => {
    console.log("Iniciando resetData...");
    
    // 1. Handle LocalDB (which uses localStorage)
    // Clear all relevant keys
    const keysToClear = [
        `vehicles`, `tires`, `logs`, `retreaders`, `tread_patterns`, 
        `service_orders`, `retread_orders`, `stock_items`, `stock_movements`, `drivers`, `fuel_entries`
    ];
    
    // Reset vehicles odometer specifically
    const vehicles = LocalDB.get(`vehicles`) as any[] || [];
    const resetVehicles = vehicles.map(v => ({
        ...v,
        odometer: 0
    }));

    // Clear everything from localStorage
    keysToClear.forEach(key => localStorage.removeItem(`gm_local_${key}`));
    
    // Restore reset vehicles
    LocalDB.set(`vehicles`, resetVehicles);
    
    console.log("LocalDB/localStorage resetado.");

    // 2. Handle Firebase
    if (db && !mockUser) {
        console.log("Resetando Firebase...");
        const collectionsToClear = [
            'tires', 'system_logs', 'retreaders', 'tread_patterns', 
            'service_orders', 'retread_orders', 'stock_items', 
            'stock_movements', 'drivers', 'fuel_entries'
        ];

        for (const col of collectionsToClear) {
            console.log("Limpando coleção:", col);
            const snapshot = await db.collection(col).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // Update vehicles in Firebase
        console.log("Resetando hodômetro dos veículos no Firebase...");
        const vehicleSnapshot = await db.collection('vehicles').get();
        const batch = db.batch();
        vehicleSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { odometer: 0 });
        });
        await batch.commit();
        console.log("Firebase resetado.");
    } else {
        console.log("Firebase não resetado (db:", !!db, ", mockUser:", !!mockUser, ")");
    }
    console.log("resetData finalizado.");
  }
};
