const COLLECTIONS = ['users', 'uploads', 'messages', 'music', 'announcements'];
const API_URL = '/api/gist';

const data = {};
let loaded = false;

function defaultData(key) {
    if (key === 'messages') return { channels: {}, groups: {}, private: {} };
    return [];
}

export const DB = {
    async load() {
        if (loaded) return;
        try {
            const res = await fetch(API_URL);
            if (res.ok) {
                const gist = await res.json();
                for (const key of COLLECTIONS) {
                    const file = gist.files[`${key}.json`];
                    if (file && file.content) {
                        try {
                            const parsed = JSON.parse(file.content);
                            data[key] = parsed[key] !== undefined ? parsed[key] : parsed;
                        } catch {
                            data[key] = defaultData(key);
                        }
                    } else {
                        data[key] = defaultData(key);
                    }
                }
            } else {
                for (const key of COLLECTIONS) {
                    data[key] = defaultData(key);
                }
            }
        } catch {
            for (const key of COLLECTIONS) {
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
        const payload = {
            files: {
                [`${key}.json`]: {
                    content: JSON.stringify(wrapper, null, 2)
                }
            }
        };
        try {
            await fetch(API_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error(`Gagal menyimpan ${key} ke Gist:`, err);
        }
    },

    async reload() {
        loaded = false;
        await this.load();
    }
};
