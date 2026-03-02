# Cognito setup for ywiki

Step-by-step to create a User Pool and App Client so the **Sign in** link works.

## 1. Open Cognito

1. Go to **[AWS Console → Cognito](https://console.aws.amazon.com/cognito/)**.
2. Click **Create user pool**.

---

## 2. Configure sign-in

1. **Sign-in experience**
   - Choose **Cognito user pool**.
   - **Sign-in options**: enable **Email** (or **Username** if you prefer).
   - Click **Next**.

2. **Security requirements**
   - Leave **Password policy** as default (or adjust).
   - **MFA**: optional (e.g. No MFA for dev).
   - Click **Next**.

3. **Sign-up experience**
   - Enable **Self-registration** if you want users to sign up from the Hosted UI.
   - **Required attributes**: Email (and any others you want).
   - Click **Next**.

4. **Message delivery**
   - **Email**: choose **Send email with Cognito** (or SES if you have it).
   - Click **Next**.

---

## 3. Integrate your app (name + domain)

1. **User pool name**: e.g. `ywiki-users`.
2. **Domain**
   - Choose **Use a Cognito domain**.
   - Domain prefix: e.g. `ywiki-auth` (must be unique in the region).
   - You’ll get: `https://ywiki-auth.auth.<region>.amazoncognito.com`. Note it.
3. **Initial app client**
   - App type: **Public client** (Hosted UI).
   - App client name: e.g. `ywiki`.
   - **Don’t** generate a client secret (Hosted UI with implicit flow doesn’t need it).
   - Under **Authentication flows**: enable **Allow authorization code grant** or **Allow implicit grant** (ywiki uses implicit for Hosted UI).
   - Under **OpenID Connect scopes**: enable **openid**, **email**, **profile**.
   - **Callback URL(s)** (add exactly):
     - `http://localhost:8080/static/callback.html`
   - **Sign-out URL(s)** (add exactly):
     - `http://localhost:8080/`
   - Click **Next**.

4. **Review and create** → **Create user pool**.

---

## 4. Get the values

After creation:

1. **User pool**
   - On the pool page, note **User pool ID** (e.g. `us-east-1_AbCdEfGhI`).

2. **App integration**
   - Go to **App integration** tab.
   - Under **App client list**, click the app (e.g. `ywiki`).
   - Note **Client ID**.

3. **Domain**
   - **App integration** → **Domain name**: you already have the domain prefix (e.g. `ywiki-auth`).
   - Full URL: `https://<prefix>.auth.<region>.amazonaws.com` (e.g. `https://ywiki-auth.auth.us-east-1.amazoncognito.com`).

4. **Region**
   - Use the region you’re in (e.g. `us-east-1`).

---

## 5. Configure ywiki

Set these **before** starting the server (PowerShell):

```powershell
$env:COGNITO_USER_POOL_ID = "us-east-1_xxxxxxxxx"   # your User pool ID
$env:COGNITO_REGION = "us-east-1"                   # your region
$env:COGNITO_CLIENT_ID = "your-client-id"          # App client ID
$env:COGNITO_DOMAIN = "https://ywiki-auth.auth.us-east-1.amazoncognito.com"   # or just "ywiki-auth"
```

Then start the app:

```powershell
.\mvnw.cmd exec:java
```

Open **http://localhost:8080/static/index.html** → click **Sign in** → you should be sent to the Cognito Hosted UI, sign in (or sign up), then redirected back with **Signed in as …** and **Sign out**.

---

## Optional: create a test user

If you didn’t enable self-registration or want a test user:

1. In the User pool → **Users** → **Create user**.
2. Enter email (and temporary password if you set one).
3. Send the invite or set password; then sign in with that user on the Hosted UI.

---

## If you deploy to Lambda/API Gateway

Add your **deployed** URLs to the same App client:

- **Callback URL**: `https://<your-api-id>.execute-api.<region>.amazonaws.com/Prod/static/callback.html`
- **Sign-out URL**: `https://<your-api-id>.execute-api.<region>.amazonaws.com/Prod/`

Then set the same four env vars in the Lambda (or in `project.properties` / config) with the deployed origin if needed.
