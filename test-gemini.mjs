import { GoogleGenAI } from '@google/genai';

async function test() {
    try {
        const ai = new GoogleGenAI({ apiKey: 'AIzaSyAavT6qYLXc6_KYr2GNRO8nxZmq1zZ4IFs' });
        const response = await ai.models.generateContent({
            model: 'gemini-3.0-flash',
            contents: 'Hello'
        });
        console.log("SUCCESS:", response.text);
    } catch (e) {
        console.error("ERROR:");
        console.error(e.message);
    }
}
test();
