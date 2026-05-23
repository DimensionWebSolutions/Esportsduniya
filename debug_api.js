
import { config } from 'dotenv';
config();

const API_KEY = process.env.RAPIDAPI_KEY;

const ENDPOINTS = [
    // NBA (API-Basketball) - Direct Host
    {
        sport: 'NBA (Direct)',
        host: 'v1.basketball.api-sports.io',
        path: '/games?live=all',
        headers: { 'x-rapidapi-host': 'v1.basketball.api-sports.io' }
    },
];

async function test() {
    console.log('--- Testing NBA Direct ---');
    for (const ep of ENDPOINTS) {
        const url = `https://${ep.host}${ep.path}`;
        console.log(`\n[${ep.sport}] ${url}`);

        try {
            const res = await fetch(url, {
                headers: {
                    'x-rapidapi-key': API_KEY,
                    ...ep.headers
                }
            });

            const text = await res.text();
            console.log('--- RAW RESPONSE ---');
            console.log(text); // Print everything!
            console.log('--------------------');

        } catch (err) {
            console.log('   ❌ Network Error:', err.message);
        }
    }
}

test();
