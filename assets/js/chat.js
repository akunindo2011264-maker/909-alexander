import { DB } from './sync.js';

export const ChatManager = {
  async _load() {
    await DB.load();
    return DB.get('messages');
  },

  async _save(msgs) {
    await DB.update('messages', msgs);
  },

  async sendChannel(name, senderId, sender, text) {
    const msgs = await this._load();
    if (!msgs.channels[name]) msgs.channels[name] = [];
    const m = {
      id: Date.now().toString(),
      senderId,
      sender,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    msgs.channels[name].push(m);
    await this._save(msgs);
    return m;
  },

  async getChannel(name) {
    const msgs = await this._load();
    return msgs.channels[name] || [];
  },

  async sendGroup(name, senderId, sender, text) {
    const msgs = await this._load();
    if (!msgs.groups[name]) msgs.groups[name] = [];
    const m = {
      id: Date.now().toString(),
      senderId,
      sender,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    msgs.groups[name].push(m);
    await this._save(msgs);
    return m;
  },

  async getGroup(name) {
    const msgs = await this._load();
    return msgs.groups[name] || [];
  },

  async sendPrivate(senderId, receiverId, sender, text) {
    const msgs = await this._load();
    const key = [senderId, receiverId].sort().join('_');
    if (!msgs.private[key]) msgs.private[key] = [];
    const m = {
      id: Date.now().toString(),
      senderId,
      sender,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    msgs.private[key].push(m);
    await this._save(msgs);
    return m;
  },

  async getPrivate(user1Id, user2Id) {
    const msgs = await this._load();
    const key = [user1Id, user2Id].sort().join('_');
    return msgs.private[key] || [];
  }
};

export function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 30) return 'Baru saja';
  if (diff < 60) return diff + ' detik';
  if (diff < 3600) return Math.floor(diff / 60) + ' menit';
  if (diff < 86400) return Math.floor(diff / 3600) + ' jam';
  if (diff < 172800) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function generateChatKey(id1, id2) {
  return [id1, id2].sort().join('_');
}