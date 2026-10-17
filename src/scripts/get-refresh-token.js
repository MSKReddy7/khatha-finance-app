/**
 * Khatha Finance — Google Drive Refresh Token Generator
 *
 * This script reads credentials from any of these sources (in priority order):
 *   1. client_secret_*.json in the project root (downloaded from Google Cloud Console)
 *   2. cloud-credentials.json in the project root
 *
 * On success it OVERWRITES cloud-credentials.json with:
 *   { clientId, clientSecret, refreshToken }
 *
 * The mobile app (config.ts) reads ONLY from cloud-credentials.json.
 *
 * Usage:
 *   node src/scripts/get-refresh-token.js
 */
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

console.log('\n============================================================');
console.log('🔑 KHATHA FINANCE: GOOGLE REFRESH TOKEN GENERATOR');
console.log('============================================================\n');

const ROOT_DIR = path.join(__dirname, '..', '..');
const CLOUD_CREDS_PATH = path.join(ROOT_DIR, 'cloud-credentials.json');

let detectedClientId = '';
let detectedClientSecret = '';

// Priority 1: Scan for client_secret_*.json files (Google Cloud Console downloads)
try {
  const rootFiles = fs.readdirSync(ROOT_DIR);
  const secretFiles = rootFiles.filter((f) => f.startsWith('client_secret_') && f.endsWith('.json'));
  for (const sf of secretFiles) {
    const raw = fs.readFileSync(path.join(ROOT_DIR, sf), 'utf-8');
    const parsed = JSON.parse(raw);
    const clientConfig = parsed.installed || parsed.web;
    if (clientConfig && clientConfig.client_id && clientConfig.client_secret) {
      detectedClientId = clientConfig.client_id;
      detectedClientSecret = clientConfig.client_secret;
      console.log(`✓ Loaded credentials from ${sf}`);
      // Immediately overwrite cloud-credentials.json with these credentials
      try {
        let existing = {};
        if (fs.existsSync(CLOUD_CREDS_PATH)) {
          try { existing = JSON.parse(fs.readFileSync(CLOUD_CREDS_PATH, 'utf-8')); } catch (_) {}
        }
        existing.clientId = detectedClientId;
        existing.clientSecret = detectedClientSecret;
        // Preserve existing refreshToken if it's still valid for the same clientId
        if (existing.clientId !== detectedClientId) {
          delete existing.refreshToken;
        }
        fs.writeFileSync(CLOUD_CREDS_PATH, JSON.stringify(existing, null, 2), 'utf-8');
        console.log(`✓ Synced credentials to cloud-credentials.json`);
      } catch (e) {}
      break;
    }
  }
} catch (e) { /* ignore */ }

// Priority 2: Fall back to existing cloud-credentials.json
if (!detectedClientId || !detectedClientSecret) {
  try {
    if (fs.existsSync(CLOUD_CREDS_PATH)) {
      const creds = JSON.parse(fs.readFileSync(CLOUD_CREDS_PATH, 'utf-8'));
      if (creds.clientId && !creds.clientId.startsWith('YOUR_')) {
        detectedClientId = creds.clientId;
        detectedClientSecret = creds.clientSecret || '';
        console.log('✓ Loaded credentials from cloud-credentials.json');
      }
    }
  } catch (e) {}
}

if (!detectedClientId) {
  console.error('❌ ERROR: No credentials found!');
  console.error('   Place your downloaded client_secret_*.json in the project root and re-run.');
  process.exit(1);
}

// Generate PKCE code_verifier and code_challenge
function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
const codeChallenge = base64UrlEncode(
  crypto.createHash('sha256').update(codeVerifier).digest()
);

const PORT = 8085;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

const authParams = new URLSearchParams({
  client_id: detectedClientId,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

console.log(`Client ID:     ${detectedClientId}`);
console.log(`Client Secret: ${detectedClientSecret ? '✓ Detected' : '✗ MISSING'}`);
console.log(`Redirect URI:  ${REDIRECT_URI}\n`);

console.log('1. Starting local listener and opening your browser...');
console.log(`If browser does not open automatically, visit:\n\n${authUrl}\n`);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname === '/') {
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(`<h2>Authorization Error</h2><p>${error}</p>`);
      server.close();
      console.error('Authorization error from Google:', error);
      process.exit(1);
    }

    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end('<h2>Authorization successful!</h2><p>You can close this tab and return to your terminal.</p>');

      server.close();
      console.log('2. Authorization code received! Exchanging for Refresh Token...\n');

      const postData = new URLSearchParams({
        code,
        client_id: detectedClientId,
        client_secret: detectedClientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }).toString();

      const tokenReq = https.request(
        'https://oauth2.googleapis.com/token',
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        (tokenRes) => {
          let data = '';
          tokenRes.on('data', (chunk) => (data += chunk));
          tokenRes.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.refresh_token) {
                console.log('============================================================');
                console.log('🎉 SUCCESS! YOUR CENTRAL REFRESH TOKEN IS:');
                console.log('============================================================\n');
                console.log(`REFRESH_TOKEN: ${json.refresh_token}\n`);

                // Write EVERYTHING to cloud-credentials.json (the single source of truth)
                try {
                  const output = {
                    clientId: detectedClientId,
                    clientSecret: detectedClientSecret,
                    refreshToken: json.refresh_token,
                  };
                  fs.writeFileSync(CLOUD_CREDS_PATH, JSON.stringify(output, null, 2), 'utf-8');
                  console.log('✓ Saved to cloud-credentials.json (single source of truth)');
                  console.log('\nAll family devices will now connect and sync automatically with ZERO login prompts!\n');
                } catch (writeErr) {
                  console.warn('Could not write cloud-credentials.json:', writeErr.message);
                }
              } else {
                console.error('Google response:', json);
                if (json.error) {
                  console.error(`\nError: ${json.error} - ${json.error_description}`);
                }
              }
            } catch (e) {
              console.error('Failed to parse response:', data);
            }
            process.exit(0);
          });
        }
      );

      tokenReq.on('error', (e) => {
        console.error('Token request error:', e);
        process.exit(1);
      });
      tokenReq.write(postData);
      tokenReq.end();
    }
  }
});

server.listen(PORT, () => {
  const openCmd =
    process.platform === 'win32'
      ? `start "" "${authUrl}"`
      : process.platform === 'darwin'
      ? `open "${authUrl}"`
      : `xdg-open "${authUrl}"`;
  exec(openCmd);
});
