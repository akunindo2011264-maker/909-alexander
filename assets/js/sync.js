const DB_PREFIX = '909_db_';
const FILES = {
    users: 'db/users.json',
    uploads: 'db/uploads.json',
    messages: 'db/messages.json',
    music: 'db/music.json',
    announcements: 'db/announcements.json'
};

const data = {};
let loaded = false;

function defaultData(key) {
    if (key === 'messages') return { channels: {}, groups: {}, private: {} };
    return [];
}

export const DB = {
    async load() {
        if (loaded) return;
        for (const [key, file] of Object.entries(FILES)) {
            const cached = localStorage.getItem(DB_PREFIX + key);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    data[key] = parsed[key] !== undefined ? parsed[key] : parsed;
                    continue;
                } catch { /* ignore parse errors, fetch from file */ }
            }
            try {
                const res = await fetch(file);
                if (res.ok) {
                    const json = await res.json();
                    data[key] = json[key] !== undefined ? json[key] : json;
                    const wrapper = {};
                    wrapper[key] = data[key];
                    localStorage.setItem(DB_PREFIX + key, JSON.stringify(wrapper));
                } else {
                    data[key] = defaultData(key);
                }
            } catch {
                data[key] = defaultData(key);
            }
        }
        loaded = true;
    },

    get(key) {
        return data[key] !== undefined ? data[key] : defaultData(key);
    },

    async update(key, value) {
        data[key] = value;
        const wrapper = {};
        wrapper[key] = value;
        localStorage.setItem(DB_PREFIX + key, JSON.stringify(wrapper));
    }
};
