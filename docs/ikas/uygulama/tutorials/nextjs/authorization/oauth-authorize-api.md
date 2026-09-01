<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/authorization/oauth-authorize-api -->

# OAuth Authorize API

- First create a folder named `oauth` inside `pages/api` folder.
- Then create a file named `authorize.ts` inside `pages/api/oauth` folder.
Your file structure should be like this:

pages

Now we are ready to implement our first API in our app. Open the `authorize.ts` and paste the following code to it.
File: pages/api/oauth/authorize.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { OAuthAPI } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';
import { config } from '@/globals/config';
import { RedisDB } from '@/lib/redis';

type AuthorizeApiRequest = {
  storeName: string;
};
type AuthorizeApiResponse = ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<AuthorizeApiResponse>>();

/**
 * This API creates an OAuth authorize URL and starts the authorization process to an ikas store
 */
router.get(async (req, res) => {
  try {
    // Validate if storeName exists on req.query
    if (!req.query.storeName) res.status(400).json({ statusCode: 400, message: 'storeName is required' });
    const { storeName } = req.query as AuthorizeApiRequest;

    // state is a dynamic variable that should be saved before starting authorization flow
    // and should be validated on callback. This is used to prevent CSRF attacks.
    const state = Math.random().toFixed(16);

    // save your state variable to a temporary key-value database like Redis, Memcached
    // or any other storage, so you can retrieve and validate on callback
    await RedisDB.state.set(state, state, 60);

    // OAuthAPI.getOAuthUrl generates a root url for your app by using given storeName
    const oauthUrl = OAuthAPI.getOAuthUrl({ storeName });

    // Create authorize url for ikas store and redirect to it
    const url = `${oauthUrl}/authorize?client_id=${config.appId}&redirect_uri=${config.callbackUrl}&scope=${config.scope}&state=${state}`;
    res.redirect(url);
    return;
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ statusCode: 500, message: err.message });
  }
});

export default router.handler({
  onError: (err: any, req, res) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).end(err.message);
  },
});
```
Copy

#### Let's explain the code:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ApiErrorResponse } from '@/globals/types';

type AuthorizeApiRequest = {
  storeName: string;
};
type AuthorizeApiResponse = ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<AuthorizeApiResponse>>();

router.get(async (req, res) => {
  // Validate if storeName exists on req.query
  if (!req.query.storeName) res.status(400).json({ statusCode: 400, message: 'storeName is required' });
  const { storeName } = req.query as AuthorizeApiRequest;
  // Your API handler code...
});
```
Copy

- We are using the `next-connect` library's `createRouter` function to create an API handler because it makes it easy to manage your HTTP Methods and apply middlewares to your API.
You can check this link for more information.

- We also define Request/Response types above handler, so it makes it easy to read the input and output of your API.
We will also use these types on the client-side to prepare request data before sending it to the server.

- This API expects a storeName query parameter which is your store subdomain.
For example, if you access your store from the `mystore.myikas.com` domain then your store name should be `mystore`.

```typescript
// state is a dynamic variable that should be saved before starting authorization flow
// and should be validated on callback. This is used to prevent CSRF attacks.
const state = Math.random().toFixed(16);
// save your state variable to a temporary key-value database like Redis, Memcached
// or any other storage, so you can retrieve and validate on callback
await RedisDB.state.set(state, state, 60);
```
Copy

- To start the authorization code flow we need a `state` variable, and it should be longer than 10 characters. To achieve this we create a random number that has 16 decimal places.
- Then we save the state variable to RedisDB with 60 seconds TTL, so we can check it on the OAuth callback handler.

```typescript
// OAuthAPI.getOAuthUrl generates a root OAuth API url for your app by using given storeName
const oauthUrl = OAuthAPI.getOAuthUrl({ storeName });
```
Copy

- `@ikas/api-client` library has a helper function named `getOAuthUrl` within the `OAuthAPI` class that returns the root OAuth API URL for given storeName.

```typescript
// Create authorize url for ikas store and redirect to it
const url = `${oauthUrl}/authorize?client_id=${config.appId}&redirect_uri=${config.callbackUrl}&scope=${config.scope}&state=${state}`;
res.redirect(url);
return;
```
Copy

- Finally, we will create an URL with all variables that we created above and redirect to this URL.
