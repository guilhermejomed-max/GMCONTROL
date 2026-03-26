
import { db, auth } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import { Tire, Vehicle, VehicleBrandModel, SystemSettings, TeamMember, StockItem, StockMovement, ModuleType, SystemLog, ServiceOrder, RetreadOrder, UserLevel, TreadPattern, Driver, TireLoan, TrackerSettings, ArrivalAlert, LocationPoint, Collaborator } from '../types';

const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj));
const INTERNAL_DOMAIN = "@sys.gmcontrol.com";

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
        await db.collection("system_logs").doc(logEntry.id).set(sanitize(logEntry));
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
               await db.collection("users").doc(userCred.user.uid).update({ lastLogin: new Date().toISOString() }).catch(() => {});
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

  register: async (usernameOrEmail: string, pass: string, name: string) => {
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

  registerTeamMember: async (orgId: string, firstName: string, lastName: string, pass: string, role: UserLevel, modules: ModuleType[], permissions: string[]) => {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    let username = baseUsername;
    let email = `${username}${INTERNAL_DOMAIN}`;
    const name = `${firstName} ${lastName}`;
    const now = new Date().toISOString();
    
    if (mockUser || !auth || !db) {
        const id = 'mock-' + Date.now();
        const member: TeamMember = { id, name, username, email, role, allowedModules: modules, permissions, createdAt: now, lastLogin: undefined };
        LocalDB.add(`users`, member);
        return username;
    }

    let userCred = null;
    let attempt = 0;
    
    while (!userCred && attempt < 5) {
        try {
            console.log("Attempting to register user:", email);
            userCred = await auth.createUserWithEmailAndPassword(email, pass);
            console.log("User created:", userCred.user?.uid);
        } catch (e: any) {
            console.error("Firebase Register Failed, details:", e);
            
            const isEmailInUse = e.code === 'auth/email-already-in-use' || (e.message && e.message.includes('auth/email-already-in-use'));
            
            if (isEmailInUse) {
                attempt++;
                username = `${baseUsername}${attempt}`;
                email = `${username}${INTERNAL_DOMAIN}`;
                console.log(`Email in use, trying new email: ${email}`);
            } else {
                if (db) {
                    // If Firebase is available but registration failed for another reason, throw error
                    throw new Error("Falha ao registrar usuário no Firebase: " + (e as Error).message);
                }
                break; // Break to fallback to LocalDB
            }
        }
    }

    if (userCred && userCred.user) {
        const member: TeamMember = { id: userCred.user.uid, name, username, email, role, allowedModules: modules, permissions, createdAt: now };
        await db.collection("users").doc(userCred.user.uid).set(sanitize(member));
        logActivity(orgId, "Criou Usuário", `Cadastrou ${name} (${username})`, 'TIRES');
        console.log("User member saved to Firestore");
        return username;
    } else if (!db) {
        const id = 'local-' + Date.now();
        const member: TeamMember = { id, name, username, email, role, allowedModules: modules, permissions, createdAt: now, lastLogin: undefined };
        LocalDB.add(`users`, member);
        console.log("User saved to LocalDB fallback");
        return username;
    } else {
        throw new Error("Não foi possível criar o usuário após várias tentativas. O nome de usuário pode estar muito comum.");
    }
  },

  updateTeamMember: async (orgId: string, id: string, data: Partial<TeamMember>) => {
    if (mockUser || id.startsWith('mock-') || id.startsWith('local-') || !db) { LocalDB.update(`users`, id, data); return; }
    await db.collection("users").doc(id).update(sanitize(data));
  },

  subscribeToTeam: (orgId: string, callback: (members: TeamMember[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`users`, callback);
    return db.collection("users").onSnapshot((snapshot) => {
      const members: TeamMember[] = [];
      snapshot.forEach((doc) => members.push(doc.data() as TeamMember));
      callback(members);
    }, () => callback([]));
  },

  deleteTeamMember: async (orgId: string, id: string) => {
    if (mockUser || id.startsWith('mock-') || id.startsWith('local-') || !db) { LocalDB.delete(`users`, id); return; }
    await db.collection("users").doc(id).delete();
  },

  subscribeToTires: (orgId: string, callback: (tires: Tire[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`tires`, callback);
    return db.collection("tires").onSnapshot((snapshot) => {
      const tires: Tire[] = [];
      snapshot.forEach((doc) => tires.push(doc.data() as Tire));
      callback(tires);
    }, (error) => console.error("Error subscribing to tires:", error));
  },

  addTire: async (orgId: string, tire: Tire) => {
    if (mockUser || !db) { LocalDB.add(`tires`, tire); logActivity(orgId, "Novo Pneu", `Cadastrou pneu ${tire.fireNumber}`, 'TIRES'); return; }
    await db.collection("tires").doc(tire.id).set(sanitize(tire));
    logActivity(orgId, "Novo Pneu", `Cadastrou pneu ${tire.fireNumber}`, 'TIRES');
  },

  updateTire: async (orgId: string, tire: Tire) => {
    const lastHistory = tire.history && tire.history.length > 0 ? tire.history[tire.history.length - 1] : null;
    const details = lastHistory ? lastHistory.details : 'Dados atualizados';
    if (mockUser || !db) { LocalDB.update(`tires`, tire.id, tire); logActivity(orgId, "Atualizou Pneu", `${tire.fireNumber} - ${details}`, 'TIRES'); return; }
    await db.collection("tires").doc(tire.id).set(sanitize(tire), { merge: true });
    logActivity(orgId, "Atualizou Pneu", `${tire.fireNumber} - ${details}`, 'TIRES');
  },

  updateTireBatch: async (orgId: string, updates: Partial<Tire>[]) => {
    if (mockUser || !db) {
        updates.forEach(u => { if(u.id) LocalDB.update(`tires`, u.id, u); });
        return;
    }
    const batch = db.batch();
    updates.forEach(update => {
      if(update.id) {
        const ref = db.collection("tires").doc(update.id);
        batch.update(ref, sanitize(update));
      }
    });
    await batch.commit();
  },

  deleteTire: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`tires`, id); logActivity(orgId, "Excluiu Pneu", `ID: ${id}`, 'TIRES'); return; }
    await db.collection("tires").doc(id).delete();
    logActivity(orgId, "Excluiu Pneu", `ID: ${id}`, 'TIRES');
  },

  subscribeToVehicles: (orgId: string, callback: (vehicles: Vehicle[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`vehicles`, callback);
    return db.collection("vehicles").onSnapshot((snapshot) => {
      const vehicles: Vehicle[] = [];
      snapshot.forEach((doc) => vehicles.push(doc.data() as Vehicle));
      callback(vehicles);
    }, (error) => console.error("Error subscribing to vehicles:", error));
  },

  addVehicle: async (orgId: string, vehicle: Vehicle) => {
    if (mockUser || !db) { LocalDB.add(`vehicles`, vehicle); logActivity(orgId, "Novo Veículo", `Placa: ${vehicle.plate}`, 'TIRES'); return; }
    await db.collection("vehicles").doc(vehicle.id).set(sanitize(vehicle));
    logActivity(orgId, "Novo Veículo", `Placa: ${vehicle.plate}`, 'TIRES');
  },

  updateVehicle: async (orgId: string, vehicle: Vehicle) => {
    const updates = { ...vehicle, lastAutoUpdateDate: new Date().toISOString() };
    if (mockUser || !db) { LocalDB.update(`vehicles`, vehicle.id, updates); logActivity(orgId, "Editou Veículo", `Placa: ${vehicle.plate}`, 'TIRES'); return; }
    await db.collection("vehicles").doc(vehicle.id).set(sanitize(updates), { merge: true });
    logActivity(orgId, "Editou Veículo", `Placa: ${vehicle.plate}`, 'TIRES');
  },

  deleteVehicle: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`vehicles`, id); logActivity(orgId, "Excluiu Veículo", `ID: ${id}`, 'TIRES'); return; }
    await db.collection("vehicles").doc(id).delete();
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
    }, (error) => console.error("Error subscribing to vehicleBrandModels:", error));
  },

  addVehicleBrandModel: async (orgId: string, model: VehicleBrandModel) => {
    if (mockUser || !db) { LocalDB.add(`vehicleBrandModels`, model); logActivity(orgId, "Nova Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES'); return; }
    await db.collection("vehicleBrandModels").doc(model.id).set(sanitize(model));
    logActivity(orgId, "Nova Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES');
  },

  updateVehicleBrandModel: async (orgId: string, model: VehicleBrandModel) => {
    if (mockUser || !db) { LocalDB.update(`vehicleBrandModels`, model.id, model); logActivity(orgId, "Editou Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES'); return; }
    await db.collection("vehicleBrandModels").doc(model.id).set(sanitize(model), { merge: true });
    logActivity(orgId, "Editou Marca/Modelo", `${model.brand} ${model.model}`, 'TIRES');
  },

  deleteVehicleBrandModel: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`vehicleBrandModels`, id); logActivity(orgId, "Excluiu Marca/Modelo", `ID: ${id}`, 'TIRES'); return; }
    await db.collection("vehicleBrandModels").doc(id).delete();
    logActivity(orgId, "Excluiu Marca/Modelo", `ID: ${id}`, 'TIRES');
  },

  updateVehicleBatch: async (orgId: string, updates: any[]) => {
    if (mockUser || !db) {
        updates.forEach(u => { if(u.id) LocalDB.update(`vehicles`, u.id, u); });
        return;
    }
    const batch = db.batch();
    updates.forEach(update => {
      if(update.id) {
        const ref = db.collection("vehicles").doc(update.id);
        batch.update(ref, sanitize(update));
      }
    });
    await batch.commit();
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
    logActivity(orgId, "Importação", `Importou ${tires.length} pneus e ${vehicles.length} veículos`, 'TIRES');
  },

  subscribeToRetreaders: (orgId: string, callback: (partners: {id: string, name: string}[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`retreaders`, callback, []);
    return db.collection("retreaders").orderBy("name").onSnapshot((snapshot) => {
        const partners: {id: string, name: string}[] = [];
        snapshot.forEach(doc => partners.push({ id: doc.id, ...doc.data() } as any));
        callback(partners);
    }, () => callback([]));
  },

  addRetreader: async (orgId: string, name: string) => {
      const id = Date.now().toString();
      if (mockUser || !db) { LocalDB.add(`retreaders`, { id, name }); return; }
      await db.collection("retreaders").doc(id).set({ name });
  },

  deleteRetreader: async (orgId: string, id: string) => {
      if (mockUser || !db) { LocalDB.delete(`retreaders`, id); return; }
      await db.collection("retreaders").doc(id).delete();
  },

  subscribeToTreadPatterns: (orgId: string, callback: (patterns: TreadPattern[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`tread_patterns`, callback, []);
    return db.collection("tread_patterns").orderBy("name").onSnapshot((snapshot) => {
        const patterns: TreadPattern[] = [];
        snapshot.forEach(doc => patterns.push({ id: doc.id, ...doc.data() } as TreadPattern));
        callback(patterns);
    }, () => callback([]));
  },

  addTreadPattern: async (orgId: string, pattern: Omit<TreadPattern, 'id'>) => {
      const id = Date.now().toString();
      if (mockUser || !db) { LocalDB.add(`tread_patterns`, { id, ...pattern }); return; }
      await db.collection("tread_patterns").doc(id).set(sanitize(pattern));
  },

  updateTreadPattern: async (orgId: string, id: string, updates: Partial<TreadPattern>) => {
      if (mockUser || !db) { LocalDB.update(`tread_patterns`, id, updates); return; }
      await db.collection("tread_patterns").doc(id).update(sanitize(updates));
  },

  deleteTreadPattern: async (orgId: string, id: string) => {
      if (mockUser || !db) { LocalDB.delete(`tread_patterns`, id); return; }
      await db.collection("tread_patterns").doc(id).delete();
  },

  subscribeToServiceOrders: (orgId: string, callback: (orders: ServiceOrder[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`service_orders`, (data) => callback(data.sort((a:any,b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
    return db.collection("service_orders").orderBy("createdAt", "desc").onSnapshot(snapshot => {
      const orders: ServiceOrder[] = [];
      snapshot.forEach(doc => orders.push(doc.data() as ServiceOrder));
      callback(orders);
    }, () => callback([]));
  },

  addServiceOrder: async (orgId: string, order: ServiceOrder) => {
    if (mockUser || !db) { LocalDB.add(`service_orders`, order); return; }
    await db.collection("service_orders").doc(order.id).set(sanitize(order));
  },

  updateServiceOrder: async (orgId: string, orderId: string, updates: Partial<ServiceOrder>) => {
    if (mockUser || !db) { LocalDB.update(`service_orders`, orderId, updates); return; }
    await db.collection("service_orders").doc(orderId).update(sanitize(updates));
  },

  updateServiceOrderBatch: async (orgId: string, updates: { id: string, updates: Partial<ServiceOrder> }[]) => {
    if (mockUser || !db) {
      updates.forEach(u => LocalDB.update(`service_orders`, u.id, u.updates));
      return;
    }
    const batch = db.batch();
    updates.forEach(u => {
      const ref = db.collection("service_orders").doc(u.id);
      batch.update(ref, sanitize(u.updates));
    });
    await batch.commit();
  },

  subscribeToMaintenancePlans: (orgId: string, callback: (plans: import('../types').MaintenancePlan[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`maintenance_plans`, callback);
    return db.collection("maintenance_plans").onSnapshot(snapshot => {
      const plans: import('../types').MaintenancePlan[] = [];
      snapshot.forEach(doc => plans.push(doc.data() as import('../types').MaintenancePlan));
      callback(plans);
    }, () => callback([]));
  },

  addMaintenancePlan: async (orgId: string, plan: import('../types').MaintenancePlan) => {
    if (mockUser || !db) { LocalDB.add(`maintenance_plans`, plan); return; }
    await db.collection("maintenance_plans").doc(plan.id).set(sanitize(plan));
  },

  updateMaintenancePlan: async (orgId: string, planId: string, updates: Partial<import('../types').MaintenancePlan>) => {
    if (mockUser || !db) { LocalDB.update(`maintenance_plans`, planId, updates); return; }
    await db.collection("maintenance_plans").doc(planId).update(sanitize(updates));
  },

  deleteMaintenancePlan: async (orgId: string, planId: string) => {
    if (mockUser || !db) { LocalDB.delete(`maintenance_plans`, planId); return; }
    await db.collection("maintenance_plans").doc(planId).delete();
  },

  subscribeToMaintenanceSchedules: (orgId: string, callback: (schedules: import('../types').MaintenanceSchedule[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`maintenance_schedules`, callback);
    return db.collection("maintenance_schedules").onSnapshot(snapshot => {
      const schedules: import('../types').MaintenanceSchedule[] = [];
      snapshot.forEach(doc => schedules.push(doc.data() as import('../types').MaintenanceSchedule));
      callback(schedules);
    }, () => callback([]));
  },

  addMaintenanceSchedule: async (orgId: string, schedule: import('../types').MaintenanceSchedule) => {
    if (mockUser || !db) { LocalDB.add(`maintenance_schedules`, schedule); return; }
    await db.collection("maintenance_schedules").doc(schedule.id).set(sanitize(schedule));
  },

  updateMaintenanceSchedule: async (orgId: string, scheduleId: string, updates: Partial<import('../types').MaintenanceSchedule>) => {
    if (mockUser || !db) { LocalDB.update(`maintenance_schedules`, scheduleId, updates); return; }
    await db.collection("maintenance_schedules").doc(scheduleId).update(sanitize(updates));
  },

  deleteMaintenanceSchedule: async (orgId: string, scheduleId: string) => {
    if (mockUser || !db) { LocalDB.delete(`maintenance_schedules`, scheduleId); return; }
    await db.collection("maintenance_schedules").doc(scheduleId).delete();
  },

  subscribeToRetreadOrders: (orgId: string, callback: (orders: RetreadOrder[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`retread_orders`, (data) => callback(data.sort((a:any,b:any) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime())));
    return db.collection("retread_orders").orderBy("sentDate", "desc").onSnapshot(snapshot => {
      const orders: RetreadOrder[] = [];
      snapshot.forEach(doc => orders.push(doc.data() as RetreadOrder));
      callback(orders);
    }, () => callback([]));
  },

  addRetreadOrder: async (orgId: string, order: RetreadOrder) => {
    if (mockUser || !db) { LocalDB.add(`retread_orders`, order); return; }
    await db.collection("retread_orders").doc(order.id).set(sanitize(order));
  },

  updateRetreadOrder: async (orgId: string, orderId: string, updates: Partial<RetreadOrder>) => {
    if (mockUser || !db) { LocalDB.update(`retread_orders`, orderId, updates); return; }
    await db.collection("retread_orders").doc(orderId).update(sanitize(updates));
  },

  subscribeToStock: (orgId: string, callback: (items: StockItem[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`stock_items`, callback);
    return db.collection("stock_items").orderBy('name').onSnapshot((snapshot) => {
      const items: StockItem[] = [];
      snapshot.forEach((doc) => items.push(doc.data() as StockItem));
      callback(items);
    }, () => {});
  },

  subscribeToStockMovements: (orgId: string, callback: (movements: StockMovement[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`stock_movements`, (data) => callback(data.sort((a:any,b:any) => new Date(b.date).getTime() - new Date(a.date).getTime())));
    return db.collection("stock_movements").orderBy('date', 'desc').limit(100).onSnapshot((snapshot) => {
      const movements: StockMovement[] = [];
      snapshot.forEach((doc) => movements.push(doc.data() as StockMovement));
      callback(movements);
    }, () => {});
  },

  addStockItem: async (orgId: string, item: StockItem) => {
    if (mockUser || !db) { LocalDB.add(`stock_items`, item); return; }
    await db.collection("stock_items").doc(item.id).set(sanitize(item));
  },

  updateStockItem: async (orgId: string, item: StockItem) => {
    if (mockUser || !db) { LocalDB.update(`stock_items`, item.id, item); return; }
    await db.collection("stock_items").doc(item.id).update(sanitize(item));
  },

  deleteStockItem: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`stock_items`, id); return; }
    await db.collection("stock_items").doc(id).delete();
  },

  registerStockMovement: async (orgId: string, movement: StockMovement) => {
    if (mockUser || !db) {
        LocalDB.add(`stock_movements`, movement);
        const items = LocalDB.get(`stock_items`) as StockItem[];
        const item = items.find(i => i.id === movement.itemId);
        if (item) {
            const newQty = movement.type === 'ENTRY' ? item.quantity + movement.quantity : item.quantity - movement.quantity;
            LocalDB.update(`stock_items`, item.id, { quantity: newQty, updatedAt: new Date().toISOString() });
        }
        return;
    }
    
    await db.collection("stock_movements").add(sanitize(movement));
    const itemRef = db.collection("stock_items").doc(movement.itemId);
    const itemDoc = await itemRef.get();
    if (itemDoc.exists) {
        const item = itemDoc.data() as StockItem;
        const newQty = movement.type === 'ENTRY' ? item.quantity + movement.quantity : item.quantity - movement.quantity;
        await itemRef.update({ quantity: newQty, updatedAt: new Date().toISOString() });
    }
  },

  subscribeToDrivers: (orgId: string, callback: (drivers: Driver[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`drivers`, callback, []);
    return db.collection("drivers").orderBy("name").onSnapshot((snapshot) => {
      const drivers: Driver[] = [];
      snapshot.forEach((doc) => drivers.push(doc.data() as Driver));
      callback(drivers);
    }, () => callback([]));
  },

  addDriver: async (orgId: string, driver: Driver) => {
    if (mockUser || !db) { LocalDB.add(`drivers`, driver); logActivity(orgId, "Novo Motorista", `Cadastrou ${driver.name}`, 'VEHICLES'); return; }
    await db.collection("drivers").doc(driver.id).set(sanitize(driver));
    logActivity(orgId, "Novo Motorista", `Cadastrou ${driver.name}`, 'VEHICLES');
  },

  updateDriver: async (orgId: string, id: string, updates: Partial<Driver>) => {
    if (mockUser || !db) { LocalDB.update(`drivers`, id, updates); return; }
    await db.collection("drivers").doc(id).update(sanitize(updates));
  },

  deleteDriver: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`drivers`, id); return; }
    await db.collection("drivers").doc(id).delete();
  },

  subscribeToCollaborators: (orgId: string, callback: (collaborators: Collaborator[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`collaborators`, callback, []);
    return db.collection("collaborators").orderBy("name").onSnapshot((snapshot) => {
      const collaborators: Collaborator[] = [];
      snapshot.forEach((doc) => collaborators.push(doc.data() as Collaborator));
      callback(collaborators);
    }, () => callback([]));
  },

  addCollaborator: async (orgId: string, collaborator: Collaborator) => {
    if (mockUser || !db) { LocalDB.add(`collaborators`, collaborator); logActivity(orgId, "Novo Colaborador", `Cadastrou ${collaborator.name}`, 'MECHANICAL'); return; }
    await db.collection("collaborators").doc(collaborator.id).set(sanitize(collaborator));
    logActivity(orgId, "Novo Colaborador", `Cadastrou ${collaborator.name}`, 'MECHANICAL');
  },

  updateCollaborator: async (orgId: string, id: string, updates: Partial<Collaborator>) => {
    if (mockUser || !db) { LocalDB.update(`collaborators`, id, updates); return; }
    await db.collection("collaborators").doc(id).update(sanitize(updates));
  },

  deleteCollaborator: async (orgId: string, id: string) => {
    if (mockUser || !db) { LocalDB.delete(`collaborators`, id); return; }
    await db.collection("collaborators").doc(id).delete();
  },

  subscribeToSettings: (orgId: string, callback: (settings: SystemSettings) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`settings`, callback, DEFAULT_SETTINGS);
    return db.collection("settings").doc("global").onSnapshot((doc) => {
      if (doc.exists) callback({ ...DEFAULT_SETTINGS, ...doc.data() } as SystemSettings);
      else callback(DEFAULT_SETTINGS);
    }, () => callback(DEFAULT_SETTINGS));
  },

  saveSettings: async (orgId: string, settings: SystemSettings) => {
    if (mockUser || !db) { LocalDB.set(`settings`, settings); return; }
    await db.collection("settings").doc("global").set(sanitize(settings));
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
    }, () => callback(DEFAULT_TRACKER));
  },

  saveTrackerSettings: async (orgId: string, settings: TrackerSettings) => {
    if (mockUser || !db) { LocalDB.set(`tracker_settings`, settings); return; }
    await db.collection("settings").doc("tracker").set(sanitize(settings));
  },

  logActivity,

  subscribeToArrivalAlerts: (orgId: string, callback: (alerts: ArrivalAlert[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`arrival_alerts`, callback, []);
    return db.collection("arrival_alerts").onSnapshot((snapshot) => {
      const alerts: ArrivalAlert[] = [];
      snapshot.forEach((doc) => alerts.push({ ...doc.data(), id: doc.id } as ArrivalAlert));
      callback(alerts);
    }, () => callback([]));
  },

  addArrivalAlert: async (orgId: string, alert: ArrivalAlert) => {
    if (mockUser || !db) { LocalDB.add(`arrival_alerts`, alert); return; }
    await db.collection("arrival_alerts").doc(alert.id).set(sanitize(alert));
  },

  updateArrivalAlert: async (orgId: string, id: string, updates: Partial<ArrivalAlert>) => {
    try {
      if (mockUser || !db) { LocalDB.update(`arrival_alerts`, id, updates); return; }
      await db.collection("arrival_alerts").doc(id).update(sanitize(updates));
    } catch (error) {
      console.error('[storageService] Error updating arrival alert:', error);
      throw error;
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
      console.error('[StorageService] Firestore delete failed:', error);
      throw error;
    }
  },

  subscribeToTireLoans: (orgId: string, callback: (loans: TireLoan[]) => void) => {
    if (mockUser || !db) return LocalDB.subscribe(`tire_loans`, callback, []);
    return db.collection("tire_loans").onSnapshot((snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as TireLoan));
    }, () => callback([]));
  },

  addTireLoan: async (orgId: string, loan: TireLoan) => {
    if (mockUser || !db) { LocalDB.add(`tire_loans`, loan); return; }
    await db.collection("tire_loans").doc(loan.id).set(sanitize(loan));
  },

  updateTireLoan: async (orgId: string, id: string, updates: Partial<TireLoan>) => {
    if (mockUser || !db) { LocalDB.update(`tire_loans`, id, updates); return; }
    await db.collection("tire_loans").doc(id).update(sanitize(updates));
  },

  getLogsByUser: async (orgId: string, userId: string, limit = 300): Promise<SystemLog[]> => {
     if (mockUser || userId.startsWith('mock-') || !db) {
         const logs = LocalDB.get(`logs`) as SystemLog[];
         return logs.filter(l => l.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
     }
     try {
       const snapshot = await db.collection("system_logs").where("userId", "==", userId).orderBy("timestamp", "desc").limit(limit).get();
       return snapshot.docs.map(doc => doc.data() as SystemLog);
     } catch (e) { return []; }
  },

  getGlobalLogs: async (orgId: string, limit = 300): Promise<SystemLog[]> => {
    if (mockUser || !db) {
        const logs = LocalDB.get(`logs`) as SystemLog[];
        return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    }
    try {
      const snapshot = await db.collection("system_logs").orderBy("timestamp", "desc").limit(limit).get();
      return snapshot.docs.map(doc => doc.data() as SystemLog);
    } catch (e) { return []; }
  },

  resetData: async (orgId: string) => {
    console.log("Iniciando resetData...");
    
    // 1. Handle LocalDB (which uses localStorage)
    // Clear all relevant keys
    const keysToClear = [
        `vehicles`, `tires`, `logs`, `retreaders`, `tread_patterns`, 
        `service_orders`, `retread_orders`, `stock_items`, `stock_movements`, `drivers`
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
            'stock_movements', 'drivers'
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
