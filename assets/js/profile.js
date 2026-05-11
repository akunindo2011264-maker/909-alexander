import { DB } from './sync.js';

export const ProfileManager = {
    async getUserStats(userId) {
        await DB.load();
        const uploads = DB.get('uploads');
        const userUploads = uploads.filter(u => u.uploaderId === userId);
        return {
            total: userUploads.length,
            photos: userUploads.filter(u => u.type === 'photo').length,
            videos: userUploads.filter(u => u.type === 'video').length
        };
    },

    async getUserById(userId) {
        await DB.load();
        const users = DB.get('users');
        const user = users.find(u => u.id === userId);
        if (!user) return null;
        const { password, ...safeUser } = user;
        return safeUser;
    },

    async getAllUsers() {
        await DB.load();
        const users = DB.get('users');
        return users.map(({ password, ...user }) => user);
    },

    async updateAvatar(userId, avatarUrl) {
        await DB.load();
        const users = DB.get('users');
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            users[idx].avatar = avatarUrl;
            await DB.update('users', users);
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
