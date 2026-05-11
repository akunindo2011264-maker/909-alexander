const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;
const GIST_API = `https://api.github.com/gists/${GIST_ID}`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!GIST_ID || !GIST_TOKEN) {
        return res.status(500).json({ error: 'Gist belum dikonfigurasi.' });
    }

    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GIST_TOKEN}`,
        'Content-Type': 'application/json'
    };

    try {
        if (req.method === 'GET') {
            const response = await fetch(GIST_API, { headers });
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        if (req.method === 'PATCH') {
            const response = await fetch(GIST_API, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
