
export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();
        const { model, ...payload } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server Configuration Error: API Key missing' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate Model Name
        // Allow only gemini/gemma models to prevent abuse of arbitrary endpoints
        const targetModel = model || 'gemini-1.5-flash';
        const allowedPatterns = [/^gemini-/, /^gemma-/];

        if (!allowedPatterns.some(p => p.test(targetModel))) {
            return new Response(JSON.stringify({ error: 'Invalid or Disallowed Model Name' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Construct Google API URL
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

        // Forward request to Google
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Pass through the status and response
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
