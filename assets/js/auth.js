import { DB } from './sync.js';

export const Auth = {
  async getUsers() {
    await DB.load();
    return { users: DB.get('users') };
  },

  async saveUsers(users) {
    await DB.update('users', users);
  },

  getCurrentUser() {
    try {
      const u = localStorage.getItem('909_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },

  setCurrentUser(user) {
    localStorage.setItem('909_user', JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('auth-change', { detail: user }));
  },

  logout() {
    localStorage.removeItem('909_user');
    window.location.hash = 'login';
    window.dispatchEvent(new CustomEvent('auth-change', { detail: null }));
    if (window.showToast) window.showToast('Berhasil keluar', 'info');
  },

  async login(username, password) {
    const db = await this.getUsers();
    const user = db.users.find(u =>
      u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (user) {
      const { password: _, ...safeUser } = user;
      this.setCurrentUser(safeUser);
      return { success: true, user: safeUser };
    }
    return { success: false, message: 'Username atau password salah.' };
  },

  async register(username, phone, password) {
    if (!username || !phone || !password) return { success: false, message: 'Semua field harus diisi.' };
    if (username.length < 3) return { success: false, message: 'Username minimal 3 karakter.' };
    if (password.length < 6) return { success: false, message: 'Password minimal 6 karakter.' };

    const db = await this.getUsers();
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username sudah digunakan.' };
    }

    const newUser = {
      id: Date.now().toString(),
      username: username.trim(),
      phone: phone.trim(),
      password,
      role: 'member',
      avatar: 'assets/images/default-avatar.png',
      bio: '',
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    await this.saveUsers(db.users);

    const { password: _, ...safeUser } = newUser;
    this.setCurrentUser(safeUser);
    return { success: true, user: safeUser };
  },

  async updateProfile(updates) {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: 'Tidak ada user aktif.' };

    const db = await this.getUsers();
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx === -1) return { success: false, message: 'User tidak ditemukan.' };

    if (updates.username && updates.username !== user.username) {
      if (db.users.find(u => u.username.toLowerCase() === updates.username.toLowerCase() && u.id !== user.id)) {
        return { success: false, message: 'Username sudah digunakan.' };
      }
      db.users[idx].username = updates.username.trim();
    }
    if (updates.phone !== undefined) db.users[idx].phone = updates.phone.trim();
    if (updates.bio !== undefined) db.users[idx].bio = updates.bio.trim();
    if (updates.avatar !== undefined) db.users[idx].avatar = updates.avatar.trim();
    if (updates.password && updates.password.trim() !== '') {
      if (updates.password.trim().length < 6) return { success: false, message: 'Password minimal 6 karakter.' };
      db.users[idx].password = updates.password.trim();
    }

    await this.saveUsers(db.users);
    const { password: _, ...safeUser } = db.users[idx];
    this.setCurrentUser(safeUser);
    return { success: true, user: safeUser };
  }
};

export function initLogin(container) {
  const form = container.querySelector('#loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const txt = btn.textContent;
    btn.textContent = '⏳...'; btn.disabled = true;

    const u = form.username.value.trim();
    const p = form.password.value.trim();
    if (!u || !p) { showToast('Isi semua field', 'error'); btn.textContent = txt; btn.disabled = false; return; }

    const r = await Auth.login(u, p);
    if (r.success) {
      showToast(`Selamat datang, ${r.user.username}!`, 'success');
      window.location.hash = 'dashboard';
    } else {
      showToast(r.message, 'error');
      btn.textContent = txt; btn.disabled = false;
    }
  });
}

export function initRegister(container) {
  const form = container.querySelector('#registerForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const txt = btn.textContent;
    btn.textContent = '⏳...'; btn.disabled = true;

    const u = form.username.value.trim();
    const ph = form.phone.value.trim();
    const pw = form.password.value.trim();
    const r = await Auth.register(u, ph, pw);
    if (r.success) {
      showToast(`Akun dibuat! Selamat datang, ${r.user.username}!`, 'success');
      window.location.hash = 'dashboard';
    } else {
      showToast(r.message, 'error');
      btn.textContent = txt; btn.disabled = false;
    }
  });
}

window.Auth = Auth;