import { DB } from './sync.js';

export const MusicManager = {
  async getAll() {
    await DB.load();
    return DB.get('music');
  },

  async add(title, url, addedBy) {
    await DB.load();
    const music = DB.get('music');
    music.push({
      id: Date.now().toString(),
      title: title.trim(),
      url: url.trim(),
      addedBy,
      timestamp: new Date().toISOString()
    });
    await DB.update('music', music);
  },

  async remove(id) {
    await DB.load();
    const music = DB.get('music');
    await DB.update('music', music.filter(m => m.id !== id));
  }
};

export class MusicPlayer {
  constructor() {
    this.audio = null;
    this.playlist = [];
    this.idx = -1;
    this.playing = false;
    this.shuffle = false;
    this.repeat = 'none';
  }

  async load() {
    this.playlist = await MusicManager.getAll();
    return this.playlist;
  }

  play(i) {
    if (i < 0 || i >= this.playlist.length) return;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener('ended', () => this._ended());
    }
    this.idx = i;
    this.audio.src = this.playlist[i].url;
    this.audio.play().catch(() => {});
    this.playing = true;
  }

  toggle() {
    if (!this.audio) return;
    if (this.playing) {
      this.audio.pause();
      this.playing = false;
    } else {
      this.audio.play().catch(() => {});
      this.playing = true;
    }
  }

  next() {
    if (!this.playlist.length) return;
    this.idx = this.shuffle
      ? Math.floor(Math.random() * this.playlist.length)
      : (this.idx + 1) % this.playlist.length;
    this.play(this.idx);
  }

  prev() {
    if (!this.playlist.length) return;
    this.idx = (this.idx - 1 + this.playlist.length) % this.playlist.length;
    this.play(this.idx);
  }

  _ended() {
    if (this.repeat === 'one') {
      this.play(this.idx);
      return;
    }
    if (this.repeat === 'all' || this.idx < this.playlist.length - 1) {
      this.next();
    } else {
      this.playing = false;
    }
  }

  current() {
    return this.playlist[this.idx] || null;
  }

  getProgress() {
    if (!this.audio) return { current: 0, duration: 0, percent: 0 };
    return {
      current: this.audio.currentTime || 0,
      duration: this.audio.duration || 0,
      percent: this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0
    };
  }

  seek(percent) {
    if (!this.audio || !this.audio.duration) return;
    this.audio.currentTime = (percent / 100) * this.audio.duration;
  }

  setVolume(v) {
    if (this.audio) this.audio.volume = Math.max(0, Math.min(1, v));
  }
}

export function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}