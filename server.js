/**
 * ywiki — Express server. Serves static frontend + /version, /auth/config, /wiki (GET/POST).
 * Cognito: set in .env (COGNITO_USER_POOL_ID, COGNITO_REGION, COGNITO_CLIENT_ID, COGNITO_DOMAIN)
 * or in project.local.properties (cognito.userPoolId, cognito.region, cognito.clientId, cognito.domain).
 * When configured, POST /wiki requires a valid Bearer (Cognito ID token).
 */
const fs = require('fs');
const path = require('path');

// Load project.local.properties first (same file as Java app), then .env can override
const localPropsPath = path.join(__dirname, 'project.local.properties');
if (fs.existsSync(localPropsPath)) {
  const content = fs.readFileSync(localPropsPath, 'utf8');
  const map = { userPoolId: 'COGNITO_USER_POOL_ID', region: 'COGNITO_REGION', clientId: 'COGNITO_CLIENT_ID', domain: 'COGNITO_DOMAIN' };
  content.split(/\r?\n/).forEach((line) => {
    const m = line.trim().match(/^\s*cognito\.(userPoolId|region|clientId|domain)\s*=\s*(.*)$/);
    if (m && map[m[1]]) {
      const val = m[2].trim();
      if (val) process.env[map[m[1]]] = process.env[map[m[1]]] || val;
    }
  });
}

require('dotenv').config();

const express = require('express');
const { createServer } = require('http');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 8080;

// --- Config ------------------------------------------------------------------
const cognito = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  region: process.env.COGNITO_REGION || 'us-east-1',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  domain: process.env.COGNITO_DOMAIN || '',
};
const domainUrl = cognito.domain
  ? (cognito.domain.includes('://') ? cognito.domain : `https://${cognito.domain}.auth.${cognito.region}.amazonaws.com`)
  : '';
const isCognitoConfigured = !!(cognito.userPoolId && cognito.clientId);

// --- In-memory wiki store ----------------------------------------------------
const wiki = new Map();

// --- JWT validation (Cognito) ------------------------------------------------
let jwtValidator = null;
if (isCognitoConfigured) {
  try {
    const { JwksClient } = require('jwks-rsa');
    const jwt = require('jsonwebtoken');
    const jwksUri = `https://cognito-idp.${cognito.region}.amazonaws.com/${cognito.userPoolId}/.well-known/jwks.json`;
    const jwksClient = new JwksClient({ jwksUri, cache: true });
    const expectedIssuer = `https://cognito-idp.${cognito.region}.amazonaws.com/${cognito.userPoolId}`;

    jwtValidator = {
      async validate(bearerToken) {
        if (!bearerToken || !bearerToken.startsWith('Bearer ')) return null;
        const token = bearerToken.slice(7).trim();
        if (!token) return null;
        try {
          const decoded = jwt.decode(token, { complete: true });
          if (!decoded || !decoded.header.kid) return null;
          const key = await jwksClient.getSigningKey(decoded.header.kid);
          const pubKey = key.getPublicKey();
          const payload = jwt.verify(token, pubKey, {
            algorithms: ['RS256'],
            issuer: expectedIssuer,
            audience: cognito.clientId,
          });
          if (payload.token_use !== 'id') return null;
          return {
            sub: payload.sub,
            email: payload.email,
            username: payload['cognito:username'] || payload.preferred_username,
          };
        } catch (err) {
          return null;
        }
      },
    };
  } catch (err) {
    console.warn('Cognito JWT validation disabled:', err.message);
  }
}

// --- Auth middleware ---------------------------------------------------------
async function requireCognito(req, res, next) {
  if (!isCognitoConfigured) return next();
  if (!jwtValidator) return next();
  const principal = await jwtValidator.validate(req.headers.authorization);
  if (principal) {
    req.cognitoPrincipal = principal;
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Valid Cognito token required' });
}

// --- Routes (API first so they take precedence) ------------------------------
app.get('/version', (req, res) => {
  const pkg = require('./package.json');
  res.type('text/plain').send(pkg.version || '0.0.0');
});

app.get('/auth/config', (req, res) => {
  res.json({
    configured: isCognitoConfigured,
    region: cognito.region,
    userPoolId: cognito.userPoolId || '',
    clientId: cognito.clientId || '',
    domain: domainUrl,
  });
});

app.get('/wiki*', (req, res) => {
  const wikiPath = req.path.slice(5) || ''; // '/wiki' -> '', '/wiki/foo' -> '/foo', '/wiki/a/b' -> '/a/b'
  const key = wikiPath.replace(/^\/+/, '');
  const entry = wiki.get(key) || null;
  res.json(entry);
});

app.post('/wiki', requireCognito, (req, res) => {
  const entry = req.body;
  if (!entry || typeof entry.path !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'path required' });
  }
  entry.edited = entry.edited || new Date().toISOString();
  wiki.set(entry.path, entry);
  res.status(200).end();
});

// --- Static: / and /static/* -------------------------------------------------
const staticDir = path.join(__dirname, 'public', 'static');
app.use('/static', express.static(staticDir));
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// --- Start -------------------------------------------------------------------
const server = createServer(app);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port %s is in use. Stop the other process (e.g. Java server) or set PORT to another number (e.g. PORT=3000 npm start).', PORT);
  } else {
    console.error(err);
  }
  process.exit(1);
});
server.listen(PORT, () => {
  console.log('ywiki server on http://localhost:' + PORT);
  if (isCognitoConfigured) {
    console.log('Cognito configured: region=%s, userPoolId=%s', cognito.region, cognito.userPoolId);
  } else {
    console.log('Cognito not configured; auth disabled. Set COGNITO_* in .env to enable.');
  }
});
