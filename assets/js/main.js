import { DB } from './sync.js';
import { Auth, initLogin, initRegister } from './auth.js';
import { UploadManager, validateFile, formatFileSize } from './upload.js';
import { ChatManager, formatTimestamp } from './chat.js';
import { MusicPlayer, MusicManager, formatTime } from './music.js';
import { ProfileManager } from './profile.js';

const musicPlayer = new MusicPlayer();
musicPlayer.load();

class App {
    constructor() {
        this.currentUser = null;
        this.currentPage = null;
        this.sidebarOpen = false;
        this.init();
    }

    async init() {
        await DB.load();
        this.currentUser = Auth.getCurrentUser();
        this.renderNavbar();
        this.router();
        window.addEventListener('hashchange', () => this.router());
        window.addEventListener('auth-change', (e) => {
            this.currentUser = e.detail;
            this.renderNavbar();
            this.router();
        });
    }

    renderNavbar() {
        const app = document.getElementById('app');
        const existingNav = app.querySelector('.navbar');
        const existingSidebar = app.querySelector('.sidebar');
        const existingOverlay = app.querySelector('.sidebar-overlay');

        if (existingNav) existingNav.remove();
        if (existingSidebar) existingSidebar.remove();
        if (existingOverlay) existingOverlay.remove();

        const nav = document.createElement('nav');
        nav.className = 'navbar';

        if (this.currentUser) {
            nav.innerHTML = `
                <div class="navbar-brand"><span>909</span> — Alexander</div>
                <button class="hamburger" id="hamburgerBtn" aria-label="Menu navigasi">
                    <span></span><span></span><span></span>
                </button>
            `;
            app.prepend(nav);
            this.createSidebar();
            this.setupHamburger();
        } else {
            nav.innerHTML = `<div class="navbar-brand"><span>909</span> — Alexander</div>`;
            app.prepend(nav);
        }
    }

    getNavLinks() {
        const role = this.currentUser?.role;
        const links = [
            { href: '#dashboard', icon: '🏠', label: 'Dashboard', roles: ['member', 'admin', 'owner'] },
            { href: '#uploads', icon: '📤', label: 'Upload', roles: ['member', 'admin', 'owner'] },
            { href: '#chat', icon: '💬', label: 'Chat', roles: ['member', 'admin', 'owner'] },
            { href: '#ai-chat', icon: '🤖', label: 'AI Chat', roles: ['member', 'admin', 'owner'] },
            { href: '#music', icon: '🎵', label: 'Musik', roles: ['member', 'admin', 'owner'] },
            { href: '#results', icon: '📁', label: 'Hasil Upload', roles: ['admin', 'owner'] },
            { href: '#announcements', icon: '📢', label: 'Pengumuman', roles: ['admin', 'owner'] },
            { href: '#owner', icon: '👑', label: 'Owner Panel', roles: ['owner'] },
            { href: '#profile', icon: '👤', label: 'Profile', roles: ['member', 'admin', 'owner'] },
        ];
        return links.filter(l => l.roles.includes(role));
    }

    createSidebar() {
        const app = document.getElementById('app');

        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        app.appendChild(overlay);

        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        sidebar.id = 'sidebar';

        const navLinks = this.getNavLinks();
        const currentHash = window.location.hash.slice(1) || 'dashboard';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-user">
                    <img src="${this.currentUser.avatar || 'assets/images/default-avatar.png'}" alt="Avatar" class="sidebar-avatar" onerror="this.src='assets/images/default-avatar.png'">
                    <div>
                        <div class="sidebar-username">${this.currentUser.username}</div>
                        <div class="sidebar-role">${this.currentUser.role}</div>
                    </div>
                </div>
            </div>
            <div class="sidebar-nav">
                ${navLinks.map(l => `
                    <a href="${l.href}" class="${currentHash === l.href.slice(1) ? 'active' : ''}">
                        <span class="nav-icon">${l.icon}</span> ${l.label}
                    </a>
                `).join('')}
            </div>
            <div class="sidebar-footer">
                <button class="btn-logout" id="sidebarLogout">🚪 Keluar dari Akun</button>
            </div>
        `;

        app.appendChild(sidebar);

        sidebar.querySelector('#sidebarLogout').addEventListener('click', () => Auth.logout());
        sidebar.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => this.closeSidebar());
        });
    }

    setupHamburger() {
        const btn = document.getElementById('hamburgerBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (!btn || !sidebar || !overlay) return;

        btn.addEventListener('click', () => this.toggleSidebar());

        overlay.addEventListener('click', () => this.closeSidebar());

        let touchStartX = 0;
        sidebar.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        sidebar.addEventListener('touchmove', (e) => {
            const delta = e.touches[0].clientX - touchStartX;
            if (delta > 60) this.closeSidebar();
        }, { passive: true });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebarOpen) this.closeSidebar();
        });
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        const btn = document.getElementById('hamburgerBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (btn) btn.classList.toggle('active', this.sidebarOpen);
        if (sidebar) sidebar.classList.toggle('active', this.sidebarOpen);
        if (overlay) overlay.classList.toggle('active', this.sidebarOpen);
        document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
    }

    closeSidebar() {
        this.sidebarOpen = false;
        const btn = document.getElementById('hamburgerBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (btn) btn.classList.remove('active');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    router() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.currentPage = hash;
        this.closeSidebar();

        if (!this.currentUser && !['login', 'register'].includes(hash)) {
            window.location.hash = 'login';
            return;
        }
        if (this.currentUser && ['login', 'register'].includes(hash)) {
            window.location.hash = 'dashboard';
            return;
        }

        this.renderPage(hash);
    }

    async renderPage(page) {
        const app = document.getElementById('app');
        let content = app.querySelector('.page-content');
        if (!content) {
            content = document.createElement('div');
            content.className = 'page-content page-enter';
            app.appendChild(content);
        } else {
            content.className = 'page-content page-enter';
        }

        const oldToast = app.querySelector('.toast-container');
        if (oldToast && oldToast.parentElement === app) oldToast.remove();

        switch (page) {
            case 'login':
                await this.loadHTML('pages/login.html', content);
                initLogin(content);
                break;
            case 'register':
                await this.loadHTML('pages/register.html', content);
                initRegister(content);
                break;
            case 'dashboard':
                await this.loadHTML('pages/dashboard.html', content);
                this.initDashboard(content);
                break;
            case 'uploads':
                await this.loadHTML('pages/uploads.html', content);
                this.initUploads(content);
                break;
            case 'results':
                await this.loadHTML('pages/results.html', content);
                this.initResults(content);
                break;
            case 'owner':
                await this.loadHTML('pages/owner.html', content);
                this.initOwner(content);
                break;
            case 'music':
                await this.loadHTML('pages/music-player.html', content);
                this.initMusic(content);
                break;
            case 'announcements':
                await this.loadHTML('pages/announcements.html', content);
                this.initAnnouncements(content);
                break;
            case 'chat':
                await this.loadHTML('pages/chat.html', content);
                this.initChat(content);
                break;
            case 'profile':
                await this.loadHTML('pages/profile.html', content);
                this.initProfile(content);
                break;
            case 'ai-chat':
                await this.loadHTML('pages/ai-chat.html', content);
                this.initAIChat(content);
                break;
            default:
                content.innerHTML = `
                    <div class="container" style="text-align:center;padding-top:60px;">
                        <span style="font-size:4rem;">🔮</span>
                        <h1 class="gradient-text">404</h1>
                        <p>Halaman tidak ditemukan di dimensi ini.</p>
                        <a href="#dashboard" class="btn btn-primary mt-2">🏠 Kembali ke Dashboard</a>
                    </div>`;
        }
    }

    async loadHTML(url, container) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Gagal memuat halaman');
            container.innerHTML = await res.text();
        } catch {
            container.innerHTML = `
                <div class="container" style="text-align:center;padding-top:40px;">
                    <p class="text-muted">⚠️ Gagal memuat halaman. Periksa koneksi atau refresh.</p>
                    <button class="btn btn-primary mt-2" onclick="location.reload()">🔄 Refresh</button>
                </div>`;
        }
    }

    async initDashboard(container) {
        const user = this.currentUser;
        const quotes = [
            '"Jatuh adalah cara bumi memelukmu lebih erat. Bangkit kembali."',
            '"Kode terbaik ditulis dalam gelap, diuji dalam sunyi."',
            '"Setiap pixel adalah jejak di kanvas semesta."',
            '"Kolaborasi bukan siapa yang terang, tapi siapa yang sinkron."',
            '"Kesalahan adalah fitur, bukan bug. Iterasi adalah nafas."',
            '"Berkreasi dalam diam, bersinar dalam ramai."',
            '"Kamera terbaik adalah yang ada di tanganmu sekarang."',
            '"Edit itu seni, bukan tools. Rasakan, jangan paksakan."'
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        const dashUsername = container.querySelector('#dashUsername');
        const dashQuote = container.querySelector('#dashQuote');
        const dashRole = container.querySelector('#dashRole');
        const dashUploadCount = container.querySelector('#dashUploadCount');
        const dashRecentActivity = container.querySelector('#dashRecentActivity');

        if (dashUsername) dashUsername.textContent = user.username;
        if (dashQuote) dashQuote.textContent = randomQuote;
        if (dashRole) {
            dashRole.innerHTML = `<span class="badge badge-${user.role}">${user.role}</span>`;
        }

        const stats = await UploadManager.getStats(user.id);
        if (dashUploadCount) dashUploadCount.textContent = stats.total;

        if (dashRecentActivity) {
            const uploads = await UploadManager.getByUser(user.id);
            const recent = uploads.slice(0, 5);
            if (recent.length === 0) {
                dashRecentActivity.innerHTML = '<p class="text-muted text-sm">Belum ada aktivitas. Yuk upload konten pertamamu! 🚀</p>';
            } else {
                dashRecentActivity.innerHTML = recent.map(u => `
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border);">
                        <div>
                            <span>${u.type === 'photo' ? '📷' : '🎬'}</span>
                            <strong>${u.name}</strong>
                        </div>
                        <span class="text-muted text-sm">${formatTimestamp(u.timestamp)}</span>
                    </div>
                `).join('');
            }
        }
    }

    initUploads(container) {
        const uploadForm = container.querySelector('#uploadForm');
        const fileInput = container.querySelector('#fileInput');
        const uploadZone = container.querySelector('#uploadZone');
        const fileName = container.querySelector('#fileName');
        const myUploadsGrid = container.querySelector('#myUploadsGrid');
        const uploadCount = container.querySelector('#uploadCount');

        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', () => {
                if (fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const validation = validateFile(file);
                    if (!validation.valid) {
                        showToast(validation.message, 'error');
                        fileInput.value = '';
                        if (fileName) fileName.textContent = 'Belum ada file dipilih';
                        return;
                    }
                    if (fileName) {
                        fileName.textContent = `✅ ${file.name} (${formatFileSize(file.size)})`;
                    }
                }
            });
        }

        if (uploadForm) {
            uploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = uploadForm.querySelector('button[type="submit"]');
                const name = uploadForm.name.value.trim();
                const type = uploadForm.type.value;
                const file = fileInput?.files[0];

                if (!name) { showToast('Beri judul konten dulu.', 'error'); return; }
                if (!file) { showToast('Pilih file dulu.', 'error'); return; }

                const validation = validateFile(file);
                if (!validation.valid) {
                    showToast(validation.message, 'error');
                    return;
                }

                submitBtn.textContent = '⏳ Mengupload...';
                submitBtn.disabled = true;

                await UploadManager.addUpload(name, type, file, this.currentUser.username, this.currentUser.id);
                showToast('✅ Upload berhasil!', 'success');
                uploadForm.reset();
                if (fileName) fileName.textContent = 'Belum ada file dipilih';
                submitBtn.textContent = '🚀 Upload Sekarang';
                submitBtn.disabled = false;
                this.loadMyUploads(myUploadsGrid, uploadCount);
            });
        }

        this.loadMyUploads(myUploadsGrid, uploadCount);
    }

    async loadMyUploads(grid, countEl) {
        if (!grid) return;
        const uploads = await UploadManager.getByUser(this.currentUser.id);
        if (countEl) countEl.textContent = `${uploads.length} konten`;

        if (uploads.length === 0) {
            grid.innerHTML = `
                <div class="glass-card text-center" style="grid-column:1/-1;">
                    <span style="font-size:2rem;">📭</span>
                    <p class="text-muted mt-1">Belum ada upload dari kamu.</p>
                    <p class="text-muted text-sm">Upload foto atau video pertamamu sekarang!</p>
                </div>`;
            return;
        }

        grid.innerHTML = uploads.map(item => `
            <div class="glass-card">
                <p><strong>${item.name}</strong></p>
                <p class="text-muted text-sm">${item.type === 'photo' ? '📷 Foto' : '🎬 Video'} &bull; ${formatFileSize(item.size)}</p>
                <p class="text-muted text-sm">${formatTimestamp(item.timestamp)}</p>
                <span class="badge badge-${this.currentUser.role}">${this.currentUser.role}</span>
            </div>
        `).join('');
    }

    async initResults(container) {
        if (!Auth.hasRole(['admin', 'owner']) && !['admin', 'owner'].includes(this.currentUser?.role)) {
            window.location.hash = 'dashboard';
            return;
        }

        const resultsGrid = container.querySelector('#resultsGrid');
        const resultsCount = container.querySelector('#resultsCount');
        const filterBtns = container.querySelectorAll('.filter-btn');

        const loadResults = async (filter = 'all') => {
            const uploads = await UploadManager.getByType(filter);
            if (resultsCount) resultsCount.textContent = `${uploads.length} konten`;
            if (!resultsGrid) return;

            if (uploads.length === 0) {
                resultsGrid.innerHTML = `
                    <div class="glass-card text-center" style="grid-column:1/-1;">
                        <span style="font-size:2rem;">📭</span>
                        <p class="text-muted">Belum ada konten.</p>
                    </div>`;
                return;
            }

            resultsGrid.innerHTML = uploads.map(item => `
                <div class="glass-card">
                    <p><strong>${item.name}</strong></p>
                    <p class="text-muted text-sm">${item.type === 'photo' ? '📷 Foto' : '🎬 Video'} &bull; ${formatFileSize(item.size)}</p>
                    <p class="text-muted text-sm">👤 <strong>${item.uploader}</strong> &bull; ${formatTimestamp(item.timestamp)}</p>
                    <div class="flex gap-1 mt-1">
                        <a href="${item.path}" download class="btn btn-sm btn-primary">⬇ Download</a>
                    </div>
                </div>
            `).join('');
        };

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadResults(btn.dataset.filter);
            });
        });

        loadResults();
    }

    async initOwner(container) {
        if (this.currentUser?.role !== 'owner') {
            window.location.hash = 'dashboard';
            return;
        }

        const userTable = container.querySelector('#userTable tbody');
        const ownerMusicList = container.querySelector('#ownerMusicList');
        const addUserForm = container.querySelector('#addUserForm');
        const changeRoleForm = container.querySelector('#changeRoleForm');
        const addMusicForm = container.querySelector('#addMusicForm');

        const loadUsers = async () => {
            if (!userTable) return;
            const users = await ProfileManager.getAllUsers();
            if (users.length === 0) {
                userTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada akun.</td></tr>';
                return;
            }
            userTable.innerHTML = users.map(u => `
                <tr>
                    <td><strong>${u.username}</strong></td>
                    <td><span class="badge badge-${u.role}">${u.role}</span></td>
                    <td>${u.phone || '-'}</td>
                    <td>${ProfileManager.formatJoinDate(u.createdAt)}</td>
                    <td>
                        ${u.id !== this.currentUser.id ? `<button class="btn btn-sm btn-outline text-muted delete-user-btn" data-id="${u.id}">🗑️</button>` : ''}
                    </td>
                </tr>
            `).join('');

            userTable.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Hapus akun ini?')) {
                        await DB.load();
                        const users = DB.get('users');
                        const filtered = users.filter(u => u.id !== btn.dataset.id);
                        await DB.update('users', filtered);
                        showToast('Akun berhasil dihapus', 'info');
                        loadUsers();
                    }
                });
            });
        };

        const loadOwnerMusic = async () => {
            if (!ownerMusicList) return;
            const music = await MusicManager.getAll();
            if (music.length === 0) {
                ownerMusicList.innerHTML = '<p class="text-muted">Belum ada musik.</p>';
                return;
            }
            ownerMusicList.innerHTML = music.map(m => `
                <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border);">
                    <div>
                        <strong>🎵 ${m.title}</strong>
                        <p class="text-muted text-sm">Ditambah oleh ${m.addedBy} &bull; ${formatTimestamp(m.timestamp)}</p>
                    </div>
                    <button class="btn btn-sm btn-outline text-muted delete-music-btn" data-id="${m.id}">🗑️</button>
                </div>
            `).join('');

            ownerMusicList.querySelectorAll('.delete-music-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Hapus musik ini?')) {
                        await MusicManager.remove(btn.dataset.id);
                        await musicPlayer.load();
                        loadOwnerMusic();
                        showToast('Musik dihapus', 'info');
                    }
                });
            });
        };

        if (addUserForm) {
            addUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(addUserForm));
                const db = await DB.load();
                const users = DB.get('users');

                if (users.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
                    showToast('Username sudah ada!', 'error');
                    return;
                }

                users.push({
                    id: Date.now().toString(),
                    username: data.username.trim(),
                    phone: data.phone.trim(),
                    password: data.password,
                    role: data.role,
                    avatar: 'assets/images/default-avatar.png',
                    bio: '',
                    createdAt: new Date().toISOString()
                });
                await DB.update('users', users);
                showToast(`Akun ${data.username} berhasil dibuat!`, 'success');
                addUserForm.reset();
                loadUsers();
            });
        }

        if (changeRoleForm) {
            changeRoleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(changeRoleForm));
                const db = await DB.load();
                const users = DB.get('users');
                const user = users.find(u => u.username.toLowerCase() === data.targetUser.toLowerCase());

                if (!user) {
                    showToast('User tidak ditemukan!', 'error');
                    return;
                }
                if (user.id === this.currentUser.id && data.newRole !== 'owner') {
                    showToast('Tidak bisa menurunkan role sendiri!', 'error');
                    return;
                }

                user.role = data.newRole;
                await DB.update('users', users);
                showToast(`Role ${user.username} diubah ke ${data.newRole}`, 'success');
                changeRoleForm.reset();
                loadUsers();

                if (user.id === this.currentUser.id) {
                    const { password, ...safeUser } = user;
                    Auth.setCurrentUser(safeUser);
                }
            });
        }

        if (addMusicForm) {
            addMusicForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(addMusicForm));
                await MusicManager.add(data.title, data.url, this.currentUser.username);
                await musicPlayer.load();
                showToast('Musik berhasil ditambahkan!', 'success');
                addMusicForm.reset();
                loadOwnerMusic();
            });
        }

        loadUsers();
        loadOwnerMusic();
    }

    async initMusic(container) {
        const audioPlayer = container.querySelector('#audioPlayer');
        const nowPlaying = container.querySelector('#nowPlaying');
        const musicList = container.querySelector('#musicList');

        const music = await MusicManager.getAll();

        if (music.length === 0) {
            if (musicList) musicList.innerHTML = '<div class="glass-card text-center"><p class="text-muted">Belum ada musik.</p></div>';
            return;
        }

        if (musicList) {
            musicList.innerHTML = music.map((m, i) => `
                <div class="glass-card flex-between" style="margin-bottom:8px;">
                    <div style="flex:1;min-width:0;">
                        <p><strong>🎵 ${m.title}</strong></p>
                        <p class="text-muted text-sm">Ditambah oleh ${m.addedBy}</p>
                    </div>
                    <div class="flex gap-1">
                        <button class="btn btn-sm btn-primary play-btn" data-index="${i}">▶ Putar</button>
                        <a href="${m.url}" download class="btn btn-sm btn-outline">⬇</a>
                    </div>
                </div>
            `).join('');

            musicList.querySelectorAll('.play-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    musicPlayer.play(index);
                    if (audioPlayer) {
                        audioPlayer.src = music[index].url;
                        audioPlayer.play().catch(() => {});
                    }
                    if (nowPlaying) {
                        nowPlaying.textContent = `🎶 Sekarang: ${music[index].title}`;
                    }
                });
            });
        }

        if (audioPlayer) {
            audioPlayer.addEventListener('play', () => {
                const track = musicPlayer.current();
                if (track && nowPlaying) {
                    nowPlaying.textContent = `🎶 Sekarang: ${track.title}`;
                }
            });
            audioPlayer.addEventListener('pause', () => {
                if (nowPlaying) nowPlaying.textContent = '⏸️ Jeda';
            });
            audioPlayer.addEventListener('ended', () => {
                musicPlayer.next();
                const track = musicPlayer.current();
                if (track && audioPlayer) {
                    audioPlayer.src = track.url;
                    audioPlayer.play().catch(() => {});
                    if (nowPlaying) nowPlaying.textContent = `🎶 Sekarang: ${track.title}`;
                }
            });
        }
    }

    async initAnnouncements(container) {
        if (!['admin', 'owner'].includes(this.currentUser?.role)) {
            window.location.hash = 'dashboard';
            return;
        }

        const announcementForm = container.querySelector('#announcementForm');
        const announcementList = container.querySelector('#announcementList');
        const announcementFormCard = container.querySelector('#announcementFormCard');

        if (!['admin', 'owner'].includes(this.currentUser?.role) && announcementFormCard) {
            announcementFormCard.style.display = 'none';
        }

        const loadAnnouncements = async () => {
            await DB.load();
            const announcements = DB.get('announcements');
            if (!announcementList) return;

            if (announcements.length === 0) {
                announcementList.innerHTML = '<div class="glass-card text-center"><p class="text-muted">Belum ada pengumuman.</p></div>';
                return;
            }

            announcementList.innerHTML = [...announcements].reverse().map(a => `
                <div class="announcement-card">
                    <p class="sender">
                        📢 ${a.sender}
                        <span class="badge badge-${a.senderRole}">${a.senderRole}</span>
                    </p>
                    <p class="mt-1">${a.message}</p>
                    <p class="time mt-1">${formatTimestamp(a.timestamp)}</p>
                </div>
            `).join('');
        };

        if (announcementForm) {
            announcementForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const message = announcementForm.message.value.trim();
                if (!message) {
                    showToast('Tulis pesan pengumuman dulu.', 'error');
                    return;
                }

                await DB.load();
                const announcements = DB.get('announcements');
                announcements.push({
                    id: Date.now().toString(),
                    message,
                    sender: this.currentUser.username,
                    senderRole: this.currentUser.role,
                    timestamp: new Date().toISOString()
                });
                await DB.update('announcements', announcements);
                showToast('📨 Pengumuman terkirim ke semua pengguna!', 'success');
                announcementForm.reset();
                loadAnnouncements();
            });
        }

        loadAnnouncements();
    }

    initChat(container) {
        const chatList = container.querySelector('#chatList');
        const chatTabs = container.querySelectorAll('.chat-tab');
        const chatTitle = container.querySelector('#chatTitle');
        const chatSubtitle = container.querySelector('#chatSubtitle');
        const chatMessages = container.querySelector('#chatMessages');
        const chatInput = container.querySelector('#chatInput');
        const chatSendBtn = container.querySelector('#chatSendBtn');
        const chatBackBtn = container.querySelector('#chatBackBtn');

        let activeChatType = 'channels';
        let activeChatName = 'umum';

        const loadChatList = async (type) => {
            if (!chatList) return;
            if (type === 'channels') {
                chatList.innerHTML = `
                    <div class="chat-list-item active" data-chat="umum" data-type="channels">
                        <div class="chat-list-icon">📡</div>
                        <div class="chat-list-info">
                            <div class="chat-list-name">Saluran Umum</div>
                            <div class="chat-list-preview">Pengumuman & info dari admin</div>
                        </div>
                    </div>
                    <div class="chat-list-item" data-chat="kreatif" data-type="channels">
                        <div class="chat-list-icon">🎨</div>
                        <div class="chat-list-info">
                            <div class="chat-list-name">Saluran Kreatif</div>
                            <div class="chat-list-preview">Diskusi konten & ide</div>
                        </div>
                    </div>`;
            } else if (type === 'groups') {
                chatList.innerHTML = `
                    <div class="chat-list-item active" data-chat="kolaborasi" data-type="groups">
                        <div class="chat-list-icon">👥</div>
                        <div class="chat-list-info">
                            <div class="chat-list-name">Grup Kolaborasi</div>
                            <div class="chat-list-preview">Project bareng, diskusi seru</div>
                        </div>
                    </div>`;
            } else if (type === 'private') {
                const users = await ProfileManager.getAllUsers();
                const others = users.filter(u => u.id !== this.currentUser.id);
                if (others.length === 0) {
                    chatList.innerHTML = '<p class="text-muted text-center mt-2">Belum ada user lain.</p>';
                } else {
                    chatList.innerHTML = others.map(u => `
                        <div class="chat-list-item" data-chat="${u.id}" data-type="private">
                            <img src="${u.avatar || 'assets/images/default-avatar.png'}" alt="${u.username}" class="chat-list-avatar" onerror="this.src='assets/images/default-avatar.png'">
                            <div class="chat-list-info">
                                <div class="chat-list-name">${u.username}</div>
                                <div class="chat-list-preview"><span class="badge badge-${u.role}">${u.role}</span></div>
                            </div>
                        </div>
                    `).join('');
                }
            }

            chatList.querySelectorAll('.chat-list-item').forEach(item => {
                item.addEventListener('click', () => {
                    chatList.querySelectorAll('.chat-list-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    activeChatType = item.dataset.type;
                    activeChatName = item.dataset.chat;
                    openChat(activeChatType, activeChatName);
                });
            });
        };

        const openChat = async (type, name) => {
            let messages = [];
            let title = name;

            if (type === 'channels') {
                messages = await ChatManager.getChannel(name);
                const channelNames = { umum: 'Saluran Umum', kreatif: 'Saluran Kreatif' };
                title = channelNames[name] || name;
                if (chatSubtitle) chatSubtitle.textContent = 'Semua member dapat melihat';
            } else if (type === 'groups') {
                messages = await ChatManager.getGroup(name);
                const groupNames = { kolaborasi: 'Grup Kolaborasi' };
                title = groupNames[name] || name;
                if (chatSubtitle) chatSubtitle.textContent = 'Hanya anggota grup';
            } else if (type === 'private') {
                messages = await ChatManager.getPrivate(this.currentUser.id, name);
                const targetUser = await ProfileManager.getUserById(name);
                title = targetUser?.username || name;
                if (chatSubtitle) chatSubtitle.textContent = 'Percakapan pribadi';
            }

            if (chatTitle) chatTitle.textContent = `${type === 'channels' ? '📡' : type === 'groups' ? '👥' : '💬'} ${title}`;
            if (chatMessages) {
                if (messages.length === 0) {
                    chatMessages.innerHTML = '<div class="chat-empty"><span style="font-size:2rem;">💭</span><p>Belum ada pesan. Mulai percakapan!</p></div>';
                } else {
                    chatMessages.innerHTML = messages.map(m => `
                        <div class="chat-bubble ${m.senderId === this.currentUser.id ? 'sent' : 'received'}">
                            ${m.senderId !== this.currentUser.id ? `<strong>${m.sender}:</strong> ` : ''}${m.text}
                            <div class="text-sm" style="opacity:0.6;margin-top:2px;">${formatTimestamp(m.timestamp)}</div>
                        </div>
                    `).join('');
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }

            if (window.innerWidth <= 768) {
                document.querySelector('.chat-sidebar')?.classList.add('hidden-mobile');
                if (chatBackBtn) chatBackBtn.classList.remove('hidden');
            }
        };

        const sendMessage = async () => {
            const text = chatInput?.value.trim();
            if (!text) return;

            if (activeChatType === 'channels') {
                await ChatManager.sendChannel(activeChatName, this.currentUser.id, this.currentUser.username, text);
            } else if (activeChatType === 'groups') {
                await ChatManager.sendGroup(activeChatName, this.currentUser.id, this.currentUser.username, text);
            } else if (activeChatType === 'private') {
                await ChatManager.sendPrivate(this.currentUser.id, activeChatName, this.currentUser.username, text);
            }

            if (chatMessages) {
                chatMessages.innerHTML += `
                    <div class="chat-bubble sent">
                        ${text}
                        <div class="text-sm" style="opacity:0.6;margin-top:2px;">Baru saja</div>
                    </div>`;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            if (chatInput) chatInput.value = '';
        };

        chatTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                chatTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadChatList(tab.dataset.tab);
                activeChatType = tab.dataset.tab;
            });
        });

        chatSendBtn?.addEventListener('click', sendMessage);
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        chatBackBtn?.addEventListener('click', () => {
            document.querySelector('.chat-sidebar')?.classList.remove('hidden-mobile');
            if (chatBackBtn) chatBackBtn.classList.add('hidden');
        });

        loadChatList('channels');
    }

    async initProfile(container) {
        const user = this.currentUser;

        const profileAvatar = container.querySelector('#profileAvatar');
        const profileUsername = container.querySelector('#profileUsername');
        const profileRoleBadge = container.querySelector('#profileRoleBadge');
        const profileBio = container.querySelector('#profileBio');
        const profileUploadCount = container.querySelector('#profileUploadCount');
        const profileJoinDate = container.querySelector('#profileJoinDate');
        const editUsername = container.querySelector('#editUsername');
        const editBio = container.querySelector('#editBio');
        const editPhone = container.querySelector('#editPhone');
        const editAvatar = container.querySelector('#editAvatar');
        const profileForm = container.querySelector('#profileForm');
        const statTotalUpload = container.querySelector('#statTotalUpload');
        const statPhotos = container.querySelector('#statPhotos');
        const statVideos = container.querySelector('#statVideos');
        const statRole = container.querySelector('#statRole');

        const stats = await ProfileManager.getUserStats(user.id);

        if (profileAvatar) profileAvatar.src = user.avatar || 'assets/images/default-avatar.png';
        if (profileUsername) profileUsername.textContent = user.username;
        if (profileRoleBadge) {
            profileRoleBadge.textContent = user.role;
            profileRoleBadge.className = `badge badge-${user.role}`;
        }
        if (profileBio) profileBio.textContent = user.bio || 'Belum ada bio';
        if (profileUploadCount) profileUploadCount.textContent = stats.total;
        if (profileJoinDate) profileJoinDate.textContent = ProfileManager.formatJoinDate(user.createdAt);
        if (editUsername) editUsername.value = user.username;
        if (editBio) editBio.value = user.bio || '';
        if (editPhone) editPhone.value = user.phone || '';
        if (editAvatar) editAvatar.value = user.avatar || '';
        if (statTotalUpload) statTotalUpload.textContent = stats.total;
        if (statPhotos) statPhotos.textContent = stats.photos;
        if (statVideos) statVideos.textContent = stats.videos;
        if (statRole) statRole.textContent = user.role;

        const avatarEditBtn = container.querySelector('#avatarEditBtn');
        if (avatarEditBtn) {
            avatarEditBtn.addEventListener('click', () => {
                const url = prompt('Masukkan URL foto profile:', user.avatar || '');
                if (url && url.trim()) {
                    ProfileManager.updateAvatar(user.id, url.trim()).then(() => {
                        const updated = Auth.getCurrentUser();
                        if (updated) {
                            updated.avatar = url.trim();
                            Auth.setCurrentUser(updated);
                        }
                        if (profileAvatar) profileAvatar.src = url.trim();
                        showToast('Foto profile diperbarui!', 'success');
                    });
                }
            });
        }

        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = profileForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = '⏳ Menyimpan...';
                submitBtn.disabled = true;

                const updates = {
                    username: editUsername?.value.trim(),
                    bio: editBio?.value.trim(),
                    phone: editPhone?.value.trim(),
                    avatar: editAvatar?.value.trim(),
                    password: profileForm.password?.value || ''
                };

                const result = await Auth.updateProfile(updates);
                if (result.success) {
                    showToast('Profile berhasil diperbarui! 💾', 'success');
                    setTimeout(() => location.reload(), 500);
                } else {
                    showToast(result.message, 'error');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }

    initAIChat(container) {
        const aiMessages = container.querySelector('#aiMessages');
        const aiInput = container.querySelector('#aiInput');
        const aiSendBtn = container.querySelector('#aiSendBtn');
        const clearBtn = container.querySelector('#clearAiChat');
        const suggestionBtns = container.querySelectorAll('.ai-suggestion');

        const responses = [
            `Wah, ${this.currentUser.username}, itu menarik banget! Ceritain lebih lanjut dong~ 😄`,
            `Hmm, aku ngerti kok. Kadang emang gitu ya hidup.`,
            `Serius? Keren banget sih! Aku jadi penasaran nih...`,
            `Hehe, ${this.currentUser.username} lucu deh. Tapi beneran, masuk akal juga sih.`,
            `Aku setuju banget sama kamu. Ngomong-ngomong, gimana kabar upload kontennya?`,
            `Boleh juga idenya. Jadi inget dulu waktu pertama kali nyoba edit video...`,
            `Ya ampun, relate banget! Aku juga pernah ngalamin hal yang mirip.`,
            `Lo serius? 😂 Oke oke, that's actually clever.`,
            `Gak nyangka ya bisa kayak gitu. Anyway, ada rencana upload apa minggu ini?`,
            `${this.currentUser.username}, lo tuh kalo ngomong dalem-dalem banget ya. Tapi suka deh vibes-nya ✨`
        ];

        const sendMessage = () => {
            const text = aiInput?.value.trim();
            if (!text) return;

            if (aiMessages) {
                aiMessages.innerHTML += `<div class="chat-bubble sent">${text}</div>`;
                aiMessages.scrollTop = aiMessages.scrollHeight;
            }
            if (aiInput) aiInput.value = '';

            const typingDots = document.createElement('div');
            typingDots.innerHTML = `
                <div class="chat-bubble received">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>`;
            if (aiMessages) {
                aiMessages.appendChild(typingDots);
                aiMessages.scrollTop = aiMessages.scrollHeight;
            }

            const delay = 800 + Math.random() * 2000;
            setTimeout(() => {
                if (typingDots.parentNode) typingDots.remove();
                const reply = responses[Math.floor(Math.random() * responses.length)];
                if (aiMessages) {
                    aiMessages.innerHTML += `<div class="chat-bubble received">${reply}</div>`;
                    aiMessages.scrollTop = aiMessages.scrollHeight;
                }
            }, delay);
        };

        aiSendBtn?.addEventListener('click', sendMessage);
        aiInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        clearBtn?.addEventListener('click', () => {
            if (aiMessages) {
                aiMessages.innerHTML = `
                    <div class="ai-chat-welcome">
                        <div class="ai-avatar-large">🤖</div>
                        <h3>Halo! Aku Rey 👋</h3>
                        <p class="text-muted">Teman ngobrol santai kamu. Cerita apa aja, aku dengerin kok~</p>
                    </div>`;
            }
        });

        suggestionBtns?.forEach(btn => {
            btn.addEventListener('click', () => {
                if (aiInput) {
                    aiInput.value = btn.textContent;
                    sendMessage();
                }
            });
        });
    }
}

function showToast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

window.showToast = showToast;
window.Auth = Auth;

document.addEventListener('DOMContentLoaded', async () => {
    await DB.load();
    new App();
});