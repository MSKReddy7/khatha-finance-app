/**
 * Khatha Finance — Google Drive Refresh Token Generator
 *
 * Workflow:
 *   1. Reads clientId & clientSecret from:
 *      a) client_secret_*.json in project root
 *      b) cloud-credentials.json in project root
 *      c) Interactive terminal prompt if neither exists
 *   2. Before authorization, cloud-credentials.json has ONLY { clientId, clientSecret }
 *      (NO refreshToken key).
 *   3. Opens browser for Google OAuth authorization.
 *   4. On SUCCESSFUL authorization, APPENDS refreshToken to cloud-credentials.json:
 *      {
 *        "clientId": "...",
 *        "clientSecret": "...",
 *        "refreshToken": "..."
 *      }
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
const readline = require('readline');

console.log('\n============================================================');
console.log('🔑 KHATHA FINANCE: GOOGLE REFRESH TOKEN GENERATOR');
console.log('============================================================\n');

const ROOT_DIR = path.join(__dirname, '..', '..');
const CLOUD_CREDS_PATH = path.join(ROOT_DIR, 'cloud-credentials.json');

function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
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
        break;
      }
    }
  } catch (e) {
    /* ignore */
  }

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
    } catch (e) {
      /* ignore */
    }
  }

  // Priority 3: Interactive terminal prompts if missing
  if (!detectedClientId) {
    console.log('No client credentials file found. Please enter them manually:');
    detectedClientId = await promptUser('Enter Google OAuth Client ID: ');
  }
  if (!detectedClientSecret) {
    detectedClientSecret = await promptUser('Enter Google OAuth Client Secret: ');
  }

  if (!detectedClientId || !detectedClientSecret) {
    console.error('\n❌ ERROR: Both Client ID and Client Secret are required!');
    process.exit(1);
  }

  // Ensure cloud-credentials.json exists with ONLY clientId and clientSecret (no refreshToken until authorized)
  try {
    let currentCreds = {};
    if (fs.existsSync(CLOUD_CREDS_PATH)) {
      try {
        currentCreds = JSON.parse(fs.readFileSync(CLOUD_CREDS_PATH, 'utf-8'));
      } catch (_) {}
    }

    const initialCreds = {
      clientId: detectedClientId,
      clientSecret: detectedClientSecret,
    };

    // If an existing valid refreshToken was already present for this exact clientId, preserve it;
    // otherwise ensure NO refreshToken key exists until authorization completes.
    if (currentCreds.clientId === detectedClientId && currentCreds.refreshToken) {
      initialCreds.refreshToken = currentCreds.refreshToken;
    }

    fs.writeFileSync(CLOUD_CREDS_PATH, JSON.stringify(initialCreds, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write initial cloud-credentials.json:', e.message);
  }

  // Generate PKCE code_verifier and code_challenge
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

  console.log(`\nClient ID:     ${detectedClientId}`);
  console.log(`Client Secret: ✓ Configured`);
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
        console.error('\n❌ Authorization error from Google:', error);
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

                  // APPEND refreshToken to cloud-credentials.json
                  try {
                    let updated = {
                      clientId: detectedClientId,
                      clientSecret: detectedClientSecret,
                    };
                    if (fs.existsSync(CLOUD_CREDS_PATH)) {
                      try {
                        updated = JSON.parse(fs.readFileSync(CLOUD_CREDS_PATH, 'utf-8'));
                      } catch (_) {}
                    }
                    updated.clientId = detectedClientId;
                    updated.clientSecret = detectedClientSecret;
                    updated.refreshToken = json.refresh_token;

                    fs.writeFileSync(CLOUD_CREDS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
                    console.log('✓ Successfully appended refreshToken to cloud-credentials.json');
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
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
