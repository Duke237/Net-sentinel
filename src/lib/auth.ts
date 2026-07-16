// Simple localStorage-based auth. No email verification, no backend.
// Given a random Unsplash human avatar on registration.

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  createdAt: number;
};

const USERS_KEY = "netsentinel.users";
const SESSION_KEY = "netsentinel.session";

// Curated Unsplash human portrait photos (stable IDs).
const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop&crop=faces",
];

type StoredUser = User & { passwordHash: string };

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

async function hashPassword(pw: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback (non-crypto): only ever hit in exotic envs.
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
  return String(h);
}

function readUsers(): StoredUser[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]") as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function setSession(user: User | null) {
  if (!isBrowser()) return;
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("netsentinel:auth"));
}

export async function register(email: string, password: string, name?: string): Promise<User> {
  email = email.trim().toLowerCase();
  if (!email || !password) throw new Error("Email and password are required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const users = readUsers();
  if (users.some((u) => u.email === email)) throw new Error("An account with that email already exists");
  const passwordHash = await hashPassword(password);
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name: name?.trim() || email.split("@")[0],
    avatarUrl: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    createdAt: Date.now(),
    passwordHash,
  };
  users.push(user);
  writeUsers(users);
  const { passwordHash: _, ...pub } = user;
  setSession(pub);
  return pub;
}

export async function login(email: string, password: string): Promise<User> {
  email = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("No account found for that email");
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error("Incorrect password");
  const { passwordHash: _, ...pub } = user;
  setSession(pub);
  return pub;
}

export function logout() {
  setSession(null);
}

export function onAuthChange(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("netsentinel:auth", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("netsentinel:auth", handler);
    window.removeEventListener("storage", handler);
  };
}
