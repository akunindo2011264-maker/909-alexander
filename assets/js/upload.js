import { DB } from './sync.js';

export const UploadManager = {
  async addUpload(name, type, file, uploader, uploaderId) {
    await DB.load();
    const uploads = DB.get('uploads');
    const item = {
      id: Date.now().toString(),
      name: name.trim(),
      type,
      uploader,
      uploaderId,
      path: `uploads/${type}s/${file.name}`,
      timestamp: new Date().toISOString(),
      size: file.size
    };
    uploads.push(item);
    await DB.update('uploads', uploads);
    return item;
  },

  async getByUser(userId) {
    await DB.load();
    return DB.get('uploads').filter(u => u.uploaderId === userId).reverse();
  },

  async getAll() {
    await DB.load();
    return [...DB.get('uploads')].reverse();
  },

  async getByType(type) {
    await DB.load();
    const all = DB.get('uploads');
    if (type === 'all') return [...all].reverse();
    return all.filter(u => u.type === type).reverse();
  },

  async getStats(userId) {
    await DB.load();
    const all = DB.get('uploads');
    const userU = all.filter(u => u.uploaderId === userId);
    return {
      total: userU.length,
      photos: userU.filter(u => u.type === 'photo').length,
      videos: userU.filter(u => u.type === 'video').length,
      totalAll: all.length
    };
  },

  async deleteUpload(id, userId) {
    await DB.load();
    const uploads = DB.get('uploads');
    const idx = uploads.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, message: 'Upload tidak ditemukan.' };
    
    const user = JSON.parse(localStorage.getItem('909_user') || '{}');
    if (uploads[idx].uploaderId !== userId && user.role !== 'owner' && user.role !== 'admin') {
      return { success: false, message: 'Tidak punya akses.' };
    }
    
    uploads.splice(idx, 1);
    await DB.update('uploads', uploads);
    return { success: true };
  }
};

export function validateFile(file) {
  if (!file) return { valid: false, message: 'Tidak ada file.' };
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
  if (!allowed.includes(file.type)) return { valid: false, message: 'Format tidak didukung.' };
  if (file.size > 100 * 1024 * 1024) return { valid: false, message: 'Maksimal 100MB.' };
  return { valid: true };
}

export function formatFileSize(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) + ' ' + u[i];
}