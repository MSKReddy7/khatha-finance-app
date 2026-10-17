/**
 * Helper script to generate a Google Drive Refresh Token for your central backup account.
 * Supports Desktop/Installed clients with PKCE and automatic loopback.
 *
 * Usage:
 *   node scripts/get-refresh-token.js
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

// Detect Client credentials from cloud-credentials.json, credentials/cloud-credentials.json, or downloaded client_secret JSONs
let detectedClientId = '';
let detectedClientSecret = '';

// 1. Check root cloud-credentials.json
try {
  const credPath = path.join(ROOT_DIR, 'cloud-credentials.json');
  if (fs.existsSync(credPath)) {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    if (creds.clientId && !creds.clientId.startsWith('YOUR_')) detectedClientId = creds.clientId;
    if (creds.clientSecret && !creds.clientSecret.startsWith('YOUR_')) detectedClientSecret = creds.clientSecret;
  }
} catch (e) {}

// 2. Check credentials/cloud-credentials.json fallback
if (!detectedClientId || !detectedClientSecret) {
  try {
    const credPath = path.join(ROOT_DIR, 'credentials', 'cloud-credentials.json');
    if (fs.existsSync(credPath)) {
      const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      if (creds.clientId && !creds.clientId.startsWith('YOUR_')) detectedClientId = creds.clientId;
      if (creds.clientSecret && !creds.clientSecret.startsWith('YOUR_')) detectedClientSecret = creds.clientSecret;
    }
  } catch (e) {}
}

// 3. Scan for client_secret JSON with client_secret present if not yet found
if (!detectedClientId || !detectedClientSecret) {
  try {
    const rootFiles = fs.readdirSync(ROOT_DIR);
    const secretFiles = rootFiles.filter((f) => f.startsWith('client_secret_') && f.endsWith('.json'));
    for (const sf of secretFiles) {
      const raw = fs.readFileSync(path.join(ROOT_DIR, sf), 'utf-8');
      const parsed = JSON.parse(raw);
      const clientConfig = parsed.installed || parsed.web;
      if (clientConfig && clientConfig.client_secret) {
        detectedClientId = clientConfig.client_id;
        detectedClientSecret = clientConfig.client_secret;
        console.log(`✓ Loaded credentials from ${sf}`);
        break;
      }
    }
  } catch (e) {
    // ignore
  }
}

// Generate PKCE code_verifier and code_challenge
function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
const codeChallenge = base64UrlEncode(
  crypto.createHash('sha256').update(codeVerifier).digest()
);

const PORT = 8085;
// For Google Desktop credentials with ["http://localhost"], Google requires http://localhost:PORT
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
console.log(`Client Secret: ${detectedClientSecret ? '✓ Detected' : 'none'}`);
console.log(`Redirect URI:  ${REDIRECT_URI}\n`);

console.log('1. Starting local listener and opening your browser...');
console.log(`If browser does not open automatically, visit this URL:\n\n${authUrl}\n`);

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

      const tokenParams = {
        code: code,
        client_id: detectedClientId,
        client_secret: detectedClientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      };

      const postData = new URLSearchParams(tokenParams).toString();

      const tokenReq = https.request(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
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

                // Auto-update root cloud-credentials.json
                try {
                  const credPath = path.join(ROOT_DIR, 'cloud-credentials.json');
                  let existing = {};
                  if (fs.existsSync(credPath)) {
                    try { existing = JSON.parse(fs.readFileSync(credPath, 'utf-8')); } catch (e) {}
                  }
                  existing.clientId = detectedClientId;
                  existing.clientSecret = detectedClientSecret;
                  existing.refreshToken = json.refresh_token;
                  fs.writeFileSync(credPath, JSON.stringify(existing, null, 2), 'utf-8');
                  console.log('✓ Successfully saved Refresh Token to cloud-credentials.json');
                } catch (writeErr) {
                  console.warn('Could not auto-write cloud-credentials.json:', writeErr.message);
                }

                // Auto-generate src/services/cloudBackup/localCredentials.ts for mobile app & APK builds
                try {
                  const localCredsPath = path.join(ROOT_DIR, 'src', 'services', 'cloudBackup', 'localCredentials.ts');
                  const localCredsContent = `export const LOCAL_CREDENTIALS = {\n  clientId: '${detectedClientId}',\n  clientSecret: '${detectedClientSecret}',\n  refreshToken: '${json.refresh_token}',\n};\n`;
                  fs.writeFileSync(localCredsPath, localCredsContent, 'utf-8');
                  console.log('✓ Successfully generated src/services/cloudBackup/localCredentials.ts');
                } catch (writeErr) {
                  console.warn('Could not auto-write localCredentials.ts:', writeErr.message);
                }

                console.log('\nAll family devices will now connect and sync automatically with ZERO login prompts!\n');
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
