
import { config } from 'dotenv';
config();

const API_KEY = process.env.RAPIDAPI_KEY;
const HOST = 'crickbuzz-official-apis.p.rapidapi.com';
const PATH = '/matches/live';

async function testCricket() {
    const url = `https://${HOST}${PATH}`;
    console.log(`Testing Cricket API: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': HOST
            }
        });

        const text = await response.text();
        console.log('--- Response Status:', response.status);

        try {
            const json = JSON.parse(text);
            console.log('--- JSON Response excerpt ---');
            console.log(JSON.stringify(json, null, 2).slice(0, 1000)); // First 1000 chars

            if (json.results && json.results.length > 0) {
                console.log('\n--- First Match ---');
                console.log(JSON.stringify(json.results[0], null, 2));
            }
        } catch (e) {
            console.log('--- Response Body (Not JSON) ---');
            console.log(text.slice(0, 1000));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testCricket();
