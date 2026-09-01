<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/create-project -->

# Create Project

## Create Next.js Project
Creating a Next.js project is easy you just need to execute the following commands on your terminal.

```bash
npx create-next-app myikas-app --example "https://github.com/ikascom/ikas-sample-app-nextjs/tree/initial"
```
Copy

Then change the directory and run the app.

```bash
cd myikas-app
pnpm dev
```
Copy

After installation is complete run the `pnpm dev` command at the root of your project where the `package.json` file is located then open http://localhost:3000/ in your browser.
If you don't see any error then you are ready to start your app development.

## Project Structure

@types

app

globals

lib

public

.env.example

.gitignore

eslint.config.mjs

LICENSE

next-env.d.ts

next.config.ts

package.json

pnpm-lock.yaml

README.md

tsconfig.json

Let's look at project structure first:

## Configure Your App
info
Before starting your app you need to acquire your App Key and App Secret from the Partners dashboard. Follow instructions here

### Update Environment File
Next.js has built-in support for loading environment variables from `.env` into `process.env`. Please check this link for further reading.
First, copy the `.env.example` file at the root of your project to create a new file named `.env`. Then, update the variables in the newly created `.env` file with your App Key, App Secret, and DEPLOY_URL.
File: .env

```bash
# NEXT_PUBLIC_* variables can be used on client-side
# Replace it with your App Key
NEXT_PUBLIC_APP_KEY=<Your-App-Key>

# Cannot be accessible on the client-side
# Replace it with your App Secret
APP_SECRET=<Your-App-Secret>

# Replace it with your Deployment URL
DEPLOY_URL=<NGROK_URL for local or Your-App-Deployment-Address for production>
```
Copy

### Check the Configuration File
After updating the `.env` file, let's check the `globals/config.ts` file. In this file environment variables that are loaded from the `.env` file are mapped to the config object.
We will use these variables to start authorization process to ikas and when accessing ikas API.
File: globals/config.ts

```typescript
export const config = {
  appId: process.env.NEXT_PUBLIC_APP_KEY || '',
  appSecret: process.env.APP_SECRET || '',

  // Api access scopes will be used to start oauth2 flow
  // Update scopes according to app requirements
  scope: 'read_products,write_products',

  deployUrl: process.env.DEPLOY_URL || 'http://localhost:3000',
  callbackUrl: (process.env.DEPLOY_URL || 'http://localhost:3000') + '/api/oauth/callback',
};
```
Copy
