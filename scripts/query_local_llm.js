const http = require('http');

// Get the prompt from command line arguments
const prompt = process.argv[2];
if (!prompt) {
    console.log("Usage: node scripts/query_local_llm.js '<prompt>'");
    process.exit(1);
}

// Configuration for the local LLM
const options = {
    hostname: '192.168.1.67',
    port: 1234,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

// Payload for the request
const data = JSON.stringify({
    model: "google/gemma-3-4b",
    messages: [
        { role: "system", content: "You are an expert coding assistant helping to build a Next.js web application. Be concise and provide code snippets where appropriate." },
        { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    stream: false
});

const req = http.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            if (json.choices && json.choices.length > 0) {
                console.log("\n--- Response from Local Gemma 3 ---\n");
                console.log(json.choices[0].message.content);
                console.log("\n-----------------------------------\n");
            } else {
                console.log("Received response but no choices:", json);
            }
        } catch (e) {
            console.error("Error parsing JSON response:", e);
            console.log("Raw output:", body);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request to local server: ${e.message}`);
    console.error("Please ensure your local LLM server is running at http://192.168.1.67:1234");
});

// Write data to request body
req.write(data);
req.end();
