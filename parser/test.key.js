const API_KEY = "YOUR_API_KEY"; // Paste your key here

async function checkKey() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${'AIzaSyBt-igDZfNqIC-RMHv9fkYaGptLewVmCSQ'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "sbi prelim question papper" }] }]
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("✅ SUCCESS! Your API key is working perfectly.");
            console.log("Model response:", data.candidates[0].content.parts[0].text);
        } else {
            console.log("❌ ERROR:", data.error.code, data.error.message);
        }
    } catch (err) {
        console.error("❌ Network Error:", err.message);
    }
}

checkKey();