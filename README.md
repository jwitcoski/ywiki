# ywiki

Fork of [philion/ywiki](https://github.com/philion/ywiki), maintained as a standalone wiki and later to be ported into the Ski Atlas backend and frontend. Repo: [jwitcoski/ywiki](https://github.com/jwitcoski/ywiki).

A simple Markdown wiki: **Node (Express)** server and static frontend. Optional Cognito auth for `POST /wiki`. The original **Java (Jersey/Lambda)** app remains in `src/main/` for Lambda deploy if needed.

**What's in this repo**

* **Resort-entry UI** — Header, stats box, map image, Markdown body (e.g. Montage Mountain); edit and click Convert to preview.
* **Cognito (optional)** — Sign in / Sign out in the top-right; when configured, `POST /wiki` requires a valid JWT.
* **Node server** — Primary runtime. Express on port 8080: `/`, `/static/*`, `/version`, `/auth/config`, `/wiki` (GET/POST), `/wiki/:pageId/revisions` (GET), `/wiki/:pageId/comments` (GET/POST).
* **Java app** — Optional. Maven/Jersey/Lambda in `src/main/` for `deploy.sh` / Lambda.

## Quick start (Node)

    npm install
    npm start

Open **http://localhost:8080**. Cognito: copy [.env.example](.env.example) to `.env` or use `project.local.properties` (see [Cognito](#cognito-optional)); restart after changing config.

## Setup

### Node (primary)

* [Node.js](https://nodejs.org/) 14+

    npm install
    npm start

Server runs at **http://localhost:8080**. Use **http://localhost:8080/** or **http://localhost:8080/static/index.html** for the UI.

**Cognito:** Set values in `project.local.properties` (project root) or in `.env` (see [.env.example](.env.example)); restart the server. Same config works for the Java app if you run it.

**Port in use?** Stop any other process on 8080 (e.g. the Java server) or run on another port: `$env:PORT=3000; npm start` (PowerShell).

### Java (optional — Lambda / deploy.sh)

Use when you need the JAR or Lambda deploy. Install [Java](http://jdk.java.net/8/), [Maven](https://maven.apache.org/), and [awscli](https://aws.amazon.com/cli/). With [Homebrew](https://brew.sh): `brew install maven awscli` (and a JDK cask if needed).

Build and run:

    .\mvnw.cmd clean package
    .\mvnw.cmd exec:java

**Windows:** Set `JAVA_HOME` to your JDK (e.g. `$env:JAVA_HOME = "C:\Program Files\Java\jdk-24"`). Then open http://localhost:8080 (same port as Node — stop one before starting the other).

## Deploying

The **deploy script** builds and deploys the **Java** JAR to Lambda. Edit `deploy.sh`: set `deployBucket` to your S3 bucket. Then run `./deploy.sh` (creates bucket, packages, uploads, deploys, prints URL). For a **Node**-based deploy you’d use a different process (e.g. Elastic Beanstalk, EC2, or a Node Lambda).

## Cognito (optional)

When configured, **Cognito** protects write operations (e.g. `POST /wiki`) with JWT validation. The UI shows **Sign in** / **Sign out** in the top-right and stores the ID token for API calls. When Cognito is *not* configured, the widget shows **“Sign in (Cognito not configured)”** and all endpoints remain open.

**Step-by-step:** See **[COGNITO_SETUP.md](COGNITO_SETUP.md)** for creating a User Pool and App Client in the AWS Console.

### 1. Create a User Pool and App Client

1. In [AWS Console](https://console.aws.amazon.com/cognito/) → **User Pools** → **Create user pool**.
2. Choose **Cognito user pool** → set sign-in options (e.g. Email).
3. Create an **App client** (e.g. "ywiki"); note the **Client ID**.
4. Under **App integration** → **Domain name**, create a domain (e.g. `ywiki-auth`) and note the full URL (e.g. `https://ywiki-auth.auth.us-east-1.amazoncognito.com`).
5. In **App client** → **Hosted UI** settings, add a **Callback URL** and **Sign-out URL**:
   - Callback: `http://localhost:8080/static/callback.html` (local) and your deployed base URL + `/static/callback.html` (e.g. `https://xxx.execute-api.region.amazonaws.com/Prod/static/callback.html`).
   - Sign-out: `http://localhost:8080/` and your deployed base URL.

### 2. Configure ywiki

Use **Node** (`npm start`) or **Java** (`.\mvnw.cmd exec:java`). Config is shared.

**Option A — `project.local.properties` (recommended)**

In the project root, create `project.local.properties` (or copy from `project.local.properties.example`):

    cognito.userPoolId=us-east-1_xxxxxxxxx
    cognito.region=us-east-1
    cognito.clientId=your-client-id
    cognito.domain=https://your-domain-prefix.auth.us-east-1.amazoncognito.com

File is gitignored. Restart the server; `/auth/config` will return `configured: true` and **Sign in** will work.

**Option B — Environment variables**

| Variable | Description |
|----------|-------------|
| `COGNITO_USER_POOL_ID` | User pool ID (e.g. `us-east-1_xxxxx`) |
| `COGNITO_REGION` | AWS region (e.g. `us-east-1`) |
| `COGNITO_CLIENT_ID` | App client ID |
| `COGNITO_DOMAIN` | Full Hosted UI URL or domain prefix only |

**Example (PowerShell, Node):**

    $env:COGNITO_USER_POOL_ID = "us-east-1_xxxxxxxxx"
    $env:COGNITO_REGION = "us-east-1"
    $env:COGNITO_CLIENT_ID = "your-client-id"
    $env:COGNITO_DOMAIN = "https://ywiki-auth.auth.us-east-1.amazoncognito.com"
    npm start

If Cognito is **not** configured, all endpoints remain open (no auth required).

---

## DynamoDB and parquet (optional)

Wiki data can be stored in **DynamoDB** (pages, revisions, comments) or kept **in-memory** (default). Schema and parquet mapping are in [db_structure.md](db_structure.md).

### Use DynamoDB

1. Set **DYNAMODB_TABLE_PREFIX** (e.g. `ywiki`) so the server and scripts use tables `{prefix}-WikiPages`, `{prefix}-WikiRevisions`, `{prefix}-WikiComments`.
2. Create tables (once):  
   `npm run create-tables`  
   Uses `AWS_REGION` and `DYNAMODB_TABLE_PREFIX` (default `ywiki`). Requires AWS credentials.
3. (Optional) Populate pages from the ski areas parquet file:  
   `npm run ingest-parquet`  
   Or pass a URL/path: `node scripts/ingest-parquet-to-wiki.js [url-or-path]`.  
   Default URL: `https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet`
4. Start the server with the same prefix:  
   `$env:DYNAMODB_TABLE_PREFIX="ywiki"; npm start` (PowerShell)

Without **DYNAMODB_TABLE_PREFIX**, the server uses an in-memory store (no AWS needed).

---

## Roadmap

**Strategy:** Get all elements of ywiki working as a **standalone** app first; then port the wiki workflow (API, persistence, auth) into the atlas **backend** (globalskiatlas_data) and **frontend** (GlobalSkiAtlas_2), with Swagger and API frontend there.

---

## Next Steps

### Phase 1 — Standalone (ywiki)

* [x] Add simple MD file, make sure it gets served.
* [x] Add simple SPA editor, host resources locally.
* [x] Resort-entry layout (stats, map image, Markdown body).
* [x] Add Cognito integrated.
* [x] Get POST/UPDATE working.
* [x] Add cloud-based doc store (e.g. DynamoDB or S3).
* [ ] Revision workflow (propose → pending → accept/reject).
* [ ] Clean up and release.
* [x] Add fully automated deploy scripts
* [x] Add project versioning
* [ ] Add log-query script
* [ ] Add status script / CW dash

### Phase 2 — Port to atlas backend + frontend

* [ ] Implement wiki API in globalskiatlas_data (Python): revisions, moderation, storage.
* [ ] Setup Swagger and API frontend in GlobalSkiAtlas_2 (or atlas backend).
* [ ] Frontend resort-entry UI and wiki editing in GlobalSkiAtlas_2; retire or archive ywiki as reference.

### Notes on sam.yaml

* Auto-generate: (fill std template)
  * Handler: from annotation on method
  * Runtime: from mvn
  * CodeUri: from mvn
  * API Value: from @Path 
  
## Open Questions

* How will revision history be stored?
* Authorization: ownership, roles?
* What MD front-end for edit vs display?

## Use Cases

### Display public page

### Display protected page

### Edit page

### Authenticate (Login)

### Search

## Technology Choices

### Persistance
* DynamoDB: http://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/examples-dynamodb.html
* S3: http://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/examples-s3.html

### Markdown Editing
* SimpleMDE: https://simplemde.com/
* StackEdit: https://github.com/benweet/stackedit
* Editor.md: https://pandao.github.io/editor.md/en.html  DIAGRAM, 2-pane
* Trumpbowyg: http://alex-d.github.io/Trumbowyg/
* MarkdownPlus: https://github.com/tylingsoft/markdown-plus
* Bootstrap Markdown: http://www.codingdrama.com/bootstrap-markdown/

https://github.com/bramp/js-sequence-diagrams

- Which supports interaction diagrams?

Others:
* https://github.com/substance/substance

Note: It would be great to use the same lib for both edit and display.

See also: http://www.developersfeed.com/awesome-javascript-wysiwyg-markdown-editors/

### Markdown Rendering


----

# Original Pet Store Docs

A basic pet store written with the [Jersey framework](https://jersey.java.net/). The `LambdaHandler` object is the main entry point for Lambda.

The application can be deployed in an AWS account using the [Serverless Application Model](https://github.com/awslabs/serverless-application-model). The `sam.yaml` file in the root folder contains the application definition

## Installation
To build and install the sample application you will need [Maven](https://maven.apache.org/) and the [AWS CLI](https://aws.amazon.com/cli/) installed on your computer.

In a shell, navigate to the sample's folder and use maven to build a deployable jar.
```
$ mvn package
```

This command should generate a `serverless-jersey-example-1.0-SNAPSHOT.jar` in the `target` folder. Now that we have generated the jar file, we can use the AWS CLI to package the template for deployment. 

You will need an S3 bucket to store the artifacts for deployment. Once you have created the S3 bucket, run the following command from the sample's folder:

```
$ aws cloudformation package --template-file sam.yaml --output-template-file output-sam.yaml --s3-bucket <YOUR S3 BUCKET NAME>
Uploading to xxxxxxxxxxxxxxxxxxxxxxxxxx  6464692 / 6464692.0  (100.00%)
Successfully packaged artifacts and wrote output template to file output-sam.yaml.
Execute the following command to deploy the packaged template
aws cloudformation deploy --template-file /your/path/output-sam.yaml --stack-name <YOUR STACK NAME>
```

As the command output suggests, you can now use the cli to deploy the application. Choose a stack name and run the `aws cloudformation deploy` command from the output of the package command.
 
```
$ aws cloudformation deploy --template-file output-sam.yaml --stack-name ServerlessJerseySample --capabilities CAPABILITY_IAM
```

Once the application is deployed, you can describe the stack to show the API endpoint that was created. The endpoint should be the `JerseyPetStoreApi` key of the `Outputs` property:

```
$ aws cloudformation describe-stacks --stack-name ServerlessJerseySample
{
    "Stacks": [
        {
            "StackId": "arn:aws:cloudformation:us-west-2:xxxxxxxx:stack/JerseySample/xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxx", 
            "Description": "Example Pet Store API written in jersey with the aws-serverless-java-container library", 
            "Tags": [], 
            "Outputs": [
                {
                    "Description": "URL for application", 
                    "OutputKey": "JerseyPetStoreApi", 
                    "OutputValue": "https://xxxxxxx.execute-api.us-west-2.amazonaws.com/Prod/pets"
                }
            ], 
            "CreationTime": "2016-12-13T22:59:31.552Z", 
            "Capabilities": [
                "CAPABILITY_IAM"
            ], 
            "StackName": "JerseySample", 
            "NotificationARNs": [], 
            "StackStatus": "UPDATE_COMPLETE"
        }
    ]
}

```

Copy the `OutputValue` into a browser to test a first request.
