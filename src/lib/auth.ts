/* ── prototype auth: real flows (signup, login, session, delete) against browser storage.
   Honest scope: credentials never leave this device; production replaces this with server auth. ── */

export interface Account {
  email: string;
  name: string;
  hash: string;
  createdAt: string;
}
interface AuthState {
  accounts: Account[];
  session: string | null; // email
}

const KEY = "lifepack.auth.v1";

const hash = (pw: string) => {
  let h = 5381;
  const salted = "lifepack-auth|" + pw;
  for (let i = 0; i < salted.length; i++) h = ((h << 5) + h + salted.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

function load(): AuthState {
  if (typeof window === "undefined") return { accounts: [], session: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { accounts: [], session: null };
}
function save(s: AuthState) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
}

export function getSession(): Account | null {
  const s = load();
  return s.accounts.find((a) => a.email === s.session) || null;
}

export function signup(name: string, email: string, password: string): { ok: true; account: Account } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { ok: false, error: "That does not look like an email address." };
  if (password.length < 6) return { ok: false, error: "Password needs at least 6 characters." };
  const s = load();
  if (s.accounts.some((a) => a.email === e)) return { ok: false, error: "An account with this email already exists. Sign in instead." };
  const account: Account = { email: e, name: name.trim() || e.split("@")[0], hash: hash(password), createdAt: new Date().toISOString() };
  s.accounts.push(account);
  s.session = e;
  save(s);
  return { ok: true, account };
}

export function login(email: string, password: string): { ok: true; account: Account } | { ok: false; error: string } {
  const e = email.trim().toLowerCase();
  const s = load();
  const account = s.accounts.find((a) => a.email === e);
  if (!account) return { ok: false, error: "No account with this email. Create one first." };
  if (account.hash !== hash(password)) return { ok: false, error: "Wrong password for this email." };
  s.session = e;
  save(s);
  return { ok: true, account };
}

export function logout() {
  const s = load();
  s.session = null;
  save(s);
}

export function deleteAccount() {
  const s = load();
  if (s.session) {
    s.accounts = s.accounts.filter((a) => a.email !== s.session);
    s.session = null;
    save(s);
  }
}

export function updateAccountName(name: string) {
  const s = load();
  const a = s.accounts.find((x) => x.email === s.session);
  if (a) {
    a.name = name;
    save(s);
  }
}
