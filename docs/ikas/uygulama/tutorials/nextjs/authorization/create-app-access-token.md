<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/authorization/create-app-access-token -->

# Request App Access Token

We successfully authorized our app to a store. Now we need to create an access token that will be used when accessing our app's APIs.
The easiest way to create this token is using ikas AppBridge.
With ikas AppBridge you can request a JWT Token from ikas Dashboard that is encrypted by your App Secret, so you can verify it on the server-side.
And the second method is validating query param signature via an internal API.
When the merchant opens your app on the ikas Dashboard, ikas will redirect to your app URL with certain query parameters.
You can validate these parameters by using your app secret.

## Create Token via ikas AppBridge

### Create `token-helpers.ts`
First, we will create a helper class that manages token lifecycle by using ikas AppBridge.

- Create a file named `token-helpers.ts` inside the `lib` folder.
- Then paste the following code to it.
File: lib/token-helpers.ts

```typescript
import { AppBridgeHelper } from '@ikas/app-helpers';
import { NextRouter } from 'next/router';
const TOKEN_KEY = 'token';
export class TokenHelpers {
  /**
   * You can only use this method if your app is displayed in IFrame within ikas dashboard
   * otherwise it won't retrieve token via AppBridge and throw a timeout error
   */
  static getTokenForIframeApp = async (router: NextRouter) => {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      // Return token if it is not expired
      if (new Date().getTime() < tokenData.exp * 1000) return token;
    }
    // Check if token is inside an IFrame
    if (window.self !== window.top) {
      // Try to retrieve token from ikas dashboard via app bridge
      try {
        // If not found in session storage
        token = (await AppBridgeHelper.getNewToken()) || null;
        if (token) {
          // Save it to the session storage
          sessionStorage.setItem(TOKEN_KEY, token);
          return token;
        }
      } catch (e) {
        console.error(e);
      }
      await router.push('/authorize-store');
    }
    return;
  };
}
```
Copy

#### Let's explain the code:

```typescript
// Get token from session storage
let token = sessionStorage.getItem(TOKEN_KEY);
if (token) {
  const tokenData = JSON.parse(atob(token.split('.')[1]));
  // Return token if it is not expired
  if (new Date().getTime() < tokenData.exp * 1000) return token;
}
```
Copy

- First, we check if the token exists in session storage.
- If a token exists then we check the expiration date of the token and if it is not expired we return it.

```typescript
// Check if token is inside an IFrame
if (window.self !== window.top) {
  // If not found in session storage request new token from ikas
  token = (await AppBridgeHelper.getNewToken()) || null;
  if (token) {
    // Save it to the session storage
    sessionStorage.setItem(TOKEN_KEY, token);
    return token;
  }
}
```
Copy

- If the token is not found in session storage or expired we will try to retrieve a new token from ikas AppBridge.
- First, we check if our app is loaded inside an iframe.
- Then we call `AppBridgeHelper.getNewToken()` function. This function requests a new token from ikas Dashboard and waits for a callback.
After the callback is received it returns the retrieved token and stops listening. If ikas AppBridge is not accessible then the function throws a timeout error.
- If the new token is successfully received then we save it to the session storage.

### Update `app/page.tsx`
Now, we can update the load function to request a new token from ikas AppBridge then navigate to the Dashboard Page.

- First, we request new token by calling `TokenHelpers.getTokenForIframeApp(router)` function.
- If we successfully receive the token then navigate to Dashboard Page otherwise navigate to Authorize Store Page
You can use the code below:

```typescript
const load = async () => {
  AppBridgeHelper.closeLoader();
  // Retrieve token from session storage or from ikas via AppBridge
  let token = await TokenHelpers.getTokenForIframeApp(router);
  if (token) {
    await router.push('/dashboard');
  } else {
    router.push('/authorize-store');
  }
}
```
Copy

Now go to ikas Dashboard and find your app on the My Apps page and click it to open.
After your app is loaded if you see success text then it means your app successfully received a new token from ikas AppBridge.

## Create Token via Signature Check
Since external apps don't have access to ikas AppBridge you need to validate query parameters that are added by ikas to your app URL.
When the merchant clicks to your app on My Apps or App Store page ikas finds your app URL and adds `authorizedAppId`, `merchantId`, `signature`, `storeName`, `timestamp` parameters to it and redirects to this URL.
When your app is mounted you need to validate these parameters to prevent security breaches by validating the `signature` parameter.
To validate `signature`, you need to calculate the SHA256 hash of `${storeName}${merchantId}${timestamp}` with your App Secret and compare it with `signature`.
You can check the following sample Node.js code that validates signature parameter for reference:

```typescript
import crypto from 'crypto';
// Concatenate storeName, merchantId and timestamp params
const hashData = `${storeName}${merchantId}${timestamp}`;
// Convert timestamp to Date
const date = new Date(parseInt(timestamp));
// Calculate the date difference timestamp and now
const dateDiff = (new Date().getTime() - date.getTime()) / 1000;
// Calculate the signature with your appSecret
const calculatedSignature = crypto
  .createHmac('sha256', appSecret)
  .update(hashData)
  .digest('hex');
// Compare signatures and check if timestamp is not older than 2 minutes
return signature == calculatedSignature && dateDiff < 120;
```
Copy

Okay let's add this functionality to our project.

### Create `get-token-with-signature.ts`

- First, we are going to create a new API that validates signature parameter and returns new JWT Token if signature is valid.
- Create a file named `get-token-with-signature.ts` inside the `pages/api` folder and paste the code below to it.
File: pages/api/get-token-with-signature.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { AuthConnectParams, validateAuthSignature } from '@ikas/api-client';
import { config } from '../../globals/config';
import { JwtHelpers } from '../../lib/jwt-helpers';
import { ApiErrorResponse } from '../../globals/types';

export type GetTokenWithSignatureApiRequest = AuthConnectParams;
export type GetTokenWithSignatureApiResponse = { token: string } | ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<GetTokenWithSignatureApiResponse>>();

/**
 * This API is implemented for external apps but can also be used by iframe apps.
 * Since external apps do not have access to AppBridge they require a different mechanism to identify stores.
 * When the merchant clicks your app from the ikas dashboard it adds some query variables to your app URL, and you should validate these variables with your app secret.
 */
router.post(async (req, res) => {
  try {
    // Validate the query parameters
    if (!req.body.authorizedAppId) res.status(400).json({ statusCode: 400, message: 'authorizedAppId is required' });
    if (!req.body.merchantId) res.status(400).json({ statusCode: 400, message: 'merchantId is required' });
    if (!req.body.signature) res.status(400).json({ statusCode: 400, message: 'signature is required' });
    if (!req.body.storeName) res.status(400).json({ statusCode: 400, message: 'storeName is required' });
    if (!req.body.timestamp) res.status(400).json({ statusCode: 400, message: 'timestamp is required' });
    const data = req.body as GetTokenWithSignatureApiRequest;
    // signature should be equal with sha256 hash of `${storeName}${merchantId}${timestamp}` string which is hashed by your appSecret
    const isValid = validateAuthSignature(data, config.appSecret);
    if (isValid) {
      res.json({ token: JwtHelpers.createToken(data.merchantId, data.authorizedAppId) });
    }
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

- This API receives `authorizedAppId`, `merchantId`, `signature`, `storeName`, `timestamp` parameters and validates the signature with `validateAuthSignature` helper function which already implemented by `@ikas/api-client` library.
- Then if the signature is valid create a JWT Token and return it to the client-side.
`JwtHelpers` class should be already added to your project if you created it by using `npx create-next-app myikas-app --example "https://github.com/ikascom/ikas-sample-app-nextjs/tree/initial"` command.

### Create `api-requests.ts`
Now we will create a helper object that will implement all API requests that is made to server-side.

- Create a file named `api-requests.ts` inside the `lib` folder and paste the code below to it.

```typescript
import axios from 'axios';
import { GetTokenWithSignatureApiRequest, GetTokenWithSignatureApiResponse } from '../pages/api/get-token-with-signature';
import { ApiErrorResponse } from '../globals/types';
/**
 * This is a helper object that holds all api requests that are used by the client-side.
 * This provides us to use strongly typed request and response data
 */
export const ApiRequests = {
  getTokenWithSignature: (data: GetTokenWithSignatureApiRequest) => makePostRequest<GetTokenWithSignatureApiResponse>({ url: '/api/get-token-with-signature', data }),
};
async function makePostRequest<T>({ url, data, token }: { url: string; data?: any; token?: string }) {
  return axios.post<T | ApiErrorResponse>(url, data, {
    headers: token
      ? {
          Authorization: `JWT ${token}`,
        }
      : undefined,
  });
}
async function makeGetRequest<T>({ url, data, token }: { url: string; data?: any; token?: string }) {
  return axios.get<T | ApiErrorResponse>(url, {
    params: data,
    headers: token
      ? {
          Authorization: `JWT ${token}`,
        }
      : undefined,
  });
}
```
Copy

### Update `token-helpers.ts`
Now let's create a function that extracts query parameters from URL and sends it to the `api/get-token-with-signature` API.
Open `lib/token-helpers.ts` add following function to `TokenHelpers` class.

```typescript
/**
 *
 * This method only works if the URL has certain query parameters.
 * These params are generated by ikas and appended your App Url which is defined at Partner dashboard
 * Since the signature is encrypted by your appSecret you should validate it on the server-side
 *
 * @param router Next Router object
 * @param params extracted query params from 'window.location'
 */
static getTokenForExternalApp = async (router: NextRouter, params: URLSearchParams) => {
  if (params.has('storeName')) {
    if (
      params.has('merchantId') &&
      params.has('signature') &&
      params.has('authorizedAppId') &&
      params.has('timestamp')
    ) {
      const connectParams: AuthConnectParams = {
        authorizedAppId: params.get('authorizedAppId')!,
        merchantId: params.get('merchantId')!,
        signature: params.get('signature')!,
        storeName: params.get('storeName')!,
        timestamp: params.get('timestamp')!,
      };
      // Call `api/get-token-with-signature` with extracted parameters
      const res = await ApiRequests.getTokenWithSignature(connectParams);
      if (res.status == 200 && res.data?.hasOwnProperty('token')) {
        // @ts-ignore
        const token = res.data.token;
        // Save token to the session storage
        sessionStorage.setItem(TOKEN_KEY, token);
        return token;
      }
    }
    window.location.replace(`/api/oauth/authorize/ikas?storeName=${params.get('storeName')}`);
    return;
  }
  await router.push('/authorize-store');
};
```
Copy

### Update `app/page.ts`
We created the `get-token-with-signature` API and called it via the `TokenHelpers.getTokenForExternalApp` function, now we just need to add it to index.ts.
First, we try to load the token via AppBridge then if we can't load it then we try to create a token via the `get-token-with-signature` API.
Please update the `load` function inside the `app/page.ts` with the code below.

```typescript
const load = async () => {
  AppBridgeHelper.closeLoader();
  const params = new URLSearchParams(window.location.search);
  // Retrieve token from session storage or from ikas via AppBridge
  let token = await TokenHelpers.getTokenForIframeApp(router);
  if (!token) {
    // App is not loaded in within ikas Dashboard try to load token via query params
    token = await TokenHelpers.getTokenForExternalApp(router, params);
  }
  if (token) {
    await router.push('/dashboard');
  }
}
```
Copy

Now we are ready to create token for merchant even if our app not loaded in ikas Dashboard.

### Validate Access Token
We need to validate every request that is made to our app APIs to prevent anonymous access.
To achieve this we simply create a middleware that verifies the JWT token before each request and returns an `Unauthorized` error if the token is expired or is not valid.

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { JwtHelpers } from './jwt-helpers';
/**
 * This middleware extracts the JWT header and verifies it with your app secret.
 * Then embeds verified token data to `req` object
 *
 * @param req NextApiRequest object
 * @param res NextApiResponse object
 * @param next next function to inform Next.js server to run next middleware or API handler
 */
export const ensureLoggedIn = async (req: NextApiRequest, res: NextApiResponse, next: () => any) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    // Remove 'JWT ' prefix
    const token = authHeader.replace('JWT ', '');
    // Verify extracted token string
    const tokenData = JwtHelpers.verifyToken(token);
    if (tokenData) {
      // Embed the token data to req.user object
      req.user = {
        authorizedAppId: tokenData.aud as string,
        merchantId: tokenData.sub!,
      };
      return next();
    }
  }
  // if not verified or token does not exist return 401 error
  res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
};
```
Copy

- This middleware extracts the `Authorization` header from the request and verifies it with your `appSecret`.
- If the token is valid embeds the user request object and proceeds to the next middleware or the API handler.
Now we can use this middleware with our handler:

```typescript
const handler = nc<NextApiRequest, NextApiResponse<AddProductApiResponse | ApiErrorResponse>>()
  .use(ensureLoggedIn)
  .post(async (req, res) => {
  });
```
Copy
