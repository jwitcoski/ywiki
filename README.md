# ywiki

Fork of [philion/ywiki](https://github.com/philion/ywiki), maintained as a standalone wiki and later to be ported into the Ski Atlas backend and frontend. Repo: [jwitcoski/ywiki](https://github.com/jwitcoski/ywiki).

Pronounced "lambda-wiki", but spelled with a 'y' because it was easier than typing out "lambda". A simple Markdown wiki in [Java](https://docs.oracle.com/javase/8/docs/api/), [Jersey](https://jersey.github.io/), and [AWS Lambda](https://aws.amazon.com/lambda/) (via [aws-serverless-java-container](https://github.com/awslabs/aws-serverless-java-container)).

**What's in this repo**

* **Resort-entry UI** — Header, stats box, map image, and Markdown body (e.g. Montage Mountain); edit body and click Convert to preview.
* **Cognito (optional)** — Sign in / Sign out in the top-right; when configured, `POST /wiki` requires a valid JWT. When not configured, the UI shows "Sign in (Cognito not configured)".
* **Maven Wrapper** — `mvnw.cmd` (Windows) so you can build and run without installing Maven.
* **Static + API** — Serves `/static/*` (HTML, CSS, JS, images) and `/version`, `/auth/config`, `/wiki` (GET/POST).

Seed: [awslabs/aws-serverless-java-container pet-store sample](https://github.com/awslabs/aws-serverless-java-container/tree/master/samples/jersey/pet-store).

## Setup

Make sure the following are installed:

* [Java 1.8](http://jdk.java.net/8/)
* [Maven](https://maven.apache.org/)
* [awscli](https://aws.amazon.com/cli/) 

### homebrew

If you have [homebrew](https://brew.sh) installed, use the following

    brew update
    brew cask install java
    brew install maven
    brew install awscli

## Building & Running

You can build and run **without installing Maven** by using the Maven Wrapper (recommended on Windows):

    .\mvnw.cmd clean package
    .\mvnw.cmd exec:java

Or with Maven installed:

    mvn clean package
    mvn exec:java

**Windows:** Ensure `JAVA_HOME` is set to your JDK installation (e.g. `C:\Program Files\Java\jdk-24`). If you only have `java` on your PATH, set it to the folder that contains `bin\java.exe`:

    $env:JAVA_HOME = "C:\Program Files\Java\jdk-24"   # PowerShell; adjust path to your JDK

This will start the Grizzly server. Open:

* **http://localhost:8080/** or **http://localhost:8080/static/index.html** — resort-entry page (auth widget top-right).
* **http://localhost:8080/version** — version string.

## Deploying

A simple deploy script exists to deploy the constructed JAR. Edit the deploy script to confirm:

* deployBucket - name of S3 bucket to use for holding deployable JARs

Then run:

    ./deploy.sh
    
This will:

1. create an S3 bucket for deployments
2. package and upload the versioned package
3. deploy the version
4. get the deployed URL
5. test the correct version was deployed

## Cognito (optional)

When configured, **Cognito** protects write operations (e.g. `POST /wiki`) with JWT validation. The UI shows **Sign in** / **Sign out** in the top-right and stores the ID token for API calls. When Cognito is *not* configured, the widget shows **“Sign in (Cognito not configured)”** and all endpoints remain open.

### 1. Create a User Pool and App Client

1. In [AWS Console](https://console.aws.amazon.com/cognito/) → **User Pools** → **Create user pool**.
2. Choose **Cognito user pool** → set sign-in options (e.g. Email).
3. Create an **App client** (e.g. "ywiki"); note the **Client ID**.
4. Under **App integration** → **Domain name**, create a domain (e.g. `ywiki-auth`) and note the full URL (e.g. `https://ywiki-auth.auth.us-east-1.amazoncognito.com`).
5. In **App client** → **Hosted UI** settings, add a **Callback URL** and **Sign-out URL**:
   - Callback: `http://localhost:8080/static/callback.html` (local) and your deployed base URL + `/static/callback.html` (e.g. `https://xxx.execute-api.region.amazonaws.com/Prod/static/callback.html`).
   - Sign-out: `http://localhost:8080/` and your deployed base URL.

### 2. Configure ywiki

Set these (env vars override `src/main/resources/project.properties`):

| Variable | Description |
|----------|-------------|
| `COGNITO_USER_POOL_ID` | User pool ID (e.g. `us-east-1_xxxxx`) |
| `COGNITO_REGION` | AWS region (e.g. `us-east-1`) |
| `COGNITO_CLIENT_ID` | App client ID |
| `COGNITO_DOMAIN` | Full Hosted UI URL, or the domain *prefix* only (e.g. `ywiki-auth` → `https://ywiki-auth.auth.region.amazoncognito.com`) |

**Example (PowerShell):**

    $env:COGNITO_USER_POOL_ID = "us-east-1_xxxxxxxxx"
    $env:COGNITO_REGION = "us-east-1"
    $env:COGNITO_CLIENT_ID = "your-client-id"
    $env:COGNITO_DOMAIN = "https://ywiki-auth.auth.us-east-1.amazoncognito.com"

If Cognito is **not** configured, all endpoints remain open (no auth required).

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
* [ ] Get POST/UPDATE working.
* [ ] Add cloud-based doc store (e.g. DynamoDB or S3).
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
