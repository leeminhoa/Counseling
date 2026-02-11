
export default async function handler(req, res) {
    // Enable CORS just in case, though rewrites should handle same-origin
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { model, ...payload } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('Server Configuration Error: GEMINI_API_KEY is missing');
            return res.status(500).json({ error: 'Server Configuration Error: API Key missing' });
        }

        // Validate Model Name
        const targetModel = model || 'gemini-1.5-flash';
        const allowedPatterns = [/^gemini-/, /^gemma-/];

        if (!allowedPatterns.some(p => p.test(targetModel))) {
            return res.status(400).json({ error: 'Invalid or Disallowed Model Name' });
        }

        // Construct Google API URL
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

        // Forward request to Google
        const googleResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        // Handle non-JSON responses from Google (e.g. 404 HTML, 503, etc.)
        if (!googleResponse.ok) {
            const errorText = await googleResponse.text();
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
            } catch (e) {
                // If not JSON, return text as error message
                throw new Error(`Google API Error (${googleResponse.status}): ${errorText}`);
            }
            return res.status(googleResponse.status).json(errorJson);
        }

        const data = await googleResponse.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
