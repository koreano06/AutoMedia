import React, { createContext, useContext, useEffect, useState } from 'react';

type AuthError = {
  type: string;
  message: string;
};

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  store_name?: string;
  role: 'admin' | 'user';
  created_at: string;
};

type StoredUser = AuthUser & {
  password: string;
};

type RegisterPayload = {
  name: string;
  username: string;
  password: string;
  store_name?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  appPublicSettings: { name: string; authMode: string } | null;
  authChecked: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
};

const USERS_STORAGE_KEY = 'automedia_users';
const SESSION_STORAGE_KEY = 'automedia_session_user_id';

const defaultAdmin: StoredUser = {
  id: 'admin-local',
  name: 'Administrador',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  store_name: 'AutoMedia',
  created_at: '2026-01-01T00:00:00.000Z',
};

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeUsername = (username: string) => username.trim().toLowerCase();

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readUsers = (): StoredUser[] => {
  if (!canUseStorage()) {
    return [defaultAdmin];
  }

  const rawUsers = window.localStorage.getItem(USERS_STORAGE_KEY);
  if (!rawUsers) {
    return [];
  }

  try {
    return JSON.parse(rawUsers) as StoredUser[];
  } catch {
    return [];
  }
};

const writeUsers = (users: StoredUser[]) => {
  if (canUseStorage()) {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }
};

const ensureDefaultAdmin = () => {
  const users = readUsers();
  const hasAdmin = users.some((user) => normalizeUsername(user.username) === defaultAdmin.username);

  if (hasAdmin) {
    return users;
  }

  const seededUsers = [defaultAdmin, ...users];
  writeUsers(seededUsers);
  return seededUsers;
};

const toPublicUser = ({ password: _password, ...user }: StoredUser): AuthUser => user;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ name: 'AutoMedia', authMode: 'local' });

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    const users = ensureDefaultAdmin();
    const sessionUserId = canUseStorage()
      ? window.localStorage.getItem(SESSION_STORAGE_KEY)
      : null;
    const sessionUser = users.find((storedUser) => storedUser.id === sessionUserId);

    if (sessionUser) {
      setUser(toPublicUser(sessionUser));
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }

    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    ensureDefaultAdmin();
    setIsLoadingPublicSettings(false);
    await checkUserAuth();
  };

  useEffect(() => {
    checkAppState();
  }, []);

  const login = async (username: string, password: string) => {
    const users = ensureDefaultAdmin();
    const normalizedUsername = normalizeUsername(username);
    const foundUser = users.find(
      (storedUser) =>
        normalizeUsername(storedUser.username) === normalizedUsername &&
        storedUser.password === password,
    );

    if (!foundUser) {
      throw new Error('Usuário ou senha inválidos.');
    }

    if (canUseStorage()) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, foundUser.id);
    }

    const publicUser = toPublicUser(foundUser);
    setUser(publicUser);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);

    return publicUser;
  };

  const register = async (payload: RegisterPayload) => {
    const users = ensureDefaultAdmin();
    const normalizedUsername = normalizeUsername(payload.username);
    const usernameExists = users.some(
      (storedUser) => normalizeUsername(storedUser.username) === normalizedUsername,
    );

    if (usernameExists) {
      throw new Error('Esse nome de usuário já está em uso.');
    }

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name: payload.name.trim(),
      username: normalizedUsername,
      password: payload.password,
      role: 'user',
      store_name: payload.store_name?.trim() || 'Minha loja',
      created_at: new Date().toISOString(),
    };

    writeUsers([...users, newUser]);

    if (canUseStorage()) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, newUser.id);
    }

    const publicUser = toPublicUser(newUser);
    setUser(publicUser);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);

    return publicUser;
  };

  const logout = () => {
    if (canUseStorage()) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        login,
        register,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
