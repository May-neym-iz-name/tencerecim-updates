<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/authorization/handling-scope-changes -->

# Handling Scope Changes

Sometimes when we add a new feature to our app may require new privileges such as listing merchant orders in our app or updating an order via our app.
To access orders our app should be authorized `read_orders` scope or `write_orders` for updating orders.
To update our OAuth scope we need to re-authorize our app and the merchant must grant new privileges to our app.
To achieve that we need to redirect to the `oauth/authorize` API with the new scope.

## Check If Our App Needs Re-Authorize
First we will create a new API that checks existing scopes on ikas and compares it with local scope on our app.
If scope is different it creates `state`, `redirectUri` variables and returns to client-side with new scope.

- Create a file named `check-for-reauthorize.ts` inside the `pages/api/oauth` folder and paste the code below to it.

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { config } from '@/globals/config';
import { ApiErrorResponse } from '@/globals/types';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';

export type CheckForReauthorizeApiRequest = {};
export type CheckForReauthorizeApiResponse = {
  required: boolean;
  authorizeData?: {
    redirectUri: string;
    scope: string;
    state: string;
  };
};

const router = createRouter<NextApiRequest, NextApiResponse<CheckForReauthorizeApiResponse | ApiErrorResponse>>();

/**
 * This API checks if scope is different from scope granted by merchant
 */
router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (token) {
      const ikas = getIkas(token);
      // Get app info from ikas
      const meRes = await ikas.adminApi.queries.me({});
      if (meRes.isSuccess && meRes.data) {
        // Compare scopes
        if (meRes.data.scope != config.scope) {
          const state = Math.random().toFixed(16);
          await RedisDB.state.set(state, state, 60);
          // Return saved state and scope to client side
          res.status(200).json({
            required: true,
            authorizeData: {
              state,
              scope: config.scope,
              redirectUri: config.callbackUrl,
            },
          });
        }
      }
    }
    res.status(200).json({ required: false });
  } catch (err: any) {
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

### Update `api-requests.ts`
Now we need to add our API to ApiRequests object, so we can use it on client-side.

- Open the `api-requests.ts` file and update ApiRequests object with the code below:

```typescript
export const ApiRequests = {
  getTokenWithSignature: (data: GetTokenWithSignatureApiRequest) => makePostRequest<GetTokenWithSignatureApiResponse>({ url: '/api/get-token-with-signature', data }),
  oauth: {
    checkForReauthorize: (token: string) => makeGetRequest<CheckForReauthorizeApiResponse>({ url: '/api/oauth/check-for-reauthorize', token }),
  },
};
```
Copy

## Update `app/page.ts`
Now we just need to call it on the load function and take action if re-authorization is required.

- Open the `app/page.ts` file and update the `load` function with the code below:

```typescript
const load = async () => {
  AppBridgeHelper.closeLoader();
  const params = new URLSearchParams(window.location.search);
  // Retrieve token from session storage or from ikas via AppBridge
  let token = await TokenHelpers.getTokenForIframeApp(router);
  let isInternallyLoaded = false;
  if (token) {
    // If we received token this means app is loaded within ikas Dashboard
    isInternallyLoaded = true;
  } else {
    // App is not loaded in within ikas Dashboard try to load token via query params
    token = await TokenHelpers.getTokenForExternalApp(router, params);
  }
  if (token) {
    // If you successfully received token it is suggested checking if your app requires re-authorization
    const res = await ApiRequests.oauth.checkForReauthorize(token);
    const data = res.data as CheckForReauthorizeApiResponse | undefined;
    if (data?.required) {
      if (isInternallyLoaded) {
        // Call app bridge reaAuthorizeApp function so ikas dashboard will navigate to app grant access page
        AppBridgeHelper.reAuthorizeApp(data.authorizeData!);
      } else {
        // Redirect to authorize api
        window.location.replace(`/api/oauth/authorize?storeName=${params.get('storeName')}`);
      }
    } else {
      await router.push('/dashboard');
    }
  }
};
```
Copy

#### Let's Explain the Code

- First, we try to load the token via AppBridge if we can we set `isInternallyLoaded` as `true` else we try to load via `getTokenForExternalApp`.
- After receiving token we call the `ApiRequests.oauth.checkForReauthorize` function that calls the `/api/oauth/check-for-reauthorize` API.
- If we receive `data.required=true` we call the `AppBridgeHelper.reAuthorizeApp` function if our app is loaded internally otherwise we redirect to the `/api/oauth/authorize` API.
- After that, you will be requested to grant new privileges on the ikas Dashboard and after accepting the new scopes you will be redirected to the `/api/oauth/callback` API again.
