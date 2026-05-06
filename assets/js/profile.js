export const ProfileManager = {
    getUserStats(userId) {
        const uploads = JSON.parse(localStorage.getItem('909_db_uploads') || '{"uploads":[]}');
        const userUploads = uploads.uploads.filter(u => u.uploaderId === userId);
        return {
            total: userUploads.length,
            photos: userUploads.filter(u => u.type === 'photo').length,
            videos: userUploads.filter(u => u.type === 'video').length
        };
    },

    getUserById(userId) {
        const db = JSON.parse(localStorage.getItem('909_db_users') || '{"users":[]}');
        const user = db.users.find(u => u.id === userId);
        if (!user) return null;
        const { password, ...safeUser } = user;
        return safeUser;
    },

    getAllUsers() {
        const db = JSON.parse(localStorage.getItem('909_db_users') || '{"users":[]}');
        return db.users.map(({ password, ...user }) => user);
    },

    updateAvatar(userId, avatarUrl) {
        const db = JSON.parse(localStorage.getItem('909_db_users') || '{"users":[]}');
        const idx = db.users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            db.users[idx].avatar = avatarUrl;
            localStorage.setItem('909_db_users', JSON.stringify(db));
            return true;
        }
        return false;
    },

    formatJoinDate(isoString) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
};