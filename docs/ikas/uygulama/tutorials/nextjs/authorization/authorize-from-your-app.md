<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/authorization/authorize-from-your-app -->

# Authorize From Your App

The first scenario that we will cover is the start authorization from the app. In this scenario, the app should get the store name from the merchant owner and send this to the `/api/oauth/authorize` API.

### Update `app/page.tsx`

- Open the index page and add a code that navigates to the authorize-store page. To achieve that you can use the code below.

```typescript
export default function Home() {
  return (
    <main className={styles.main}>
      <div>Please wait...</div>
    </main>
  );
}
```
Copy

- Then open http://localhost:3000 on your browser and, you should automatically be redirected to authorize store page.

### Start Authorization

- When you enter your store name and hit the enter button this form will redirect to `/api/oauth/authorize` API with `storeName` query param.
- Then Authorize API will create a new URL with `storeName`, `state`, `client_id`, `scope`, and `redirect_uri` and redirect you to ikas dashboard.

### Grant Access to Your App

- If all query parameters are correct you should see the Grant App Access page:

- Then click the Install App button.

### Complete Authorization

- After that ikas will generate a unique code and redirect to your redirect_uri, which is `/api/oauth/callback` API, with `code`, `storeName`, `state`.
- Callback will validate the state and request `access_token` with `code` then save it to the Redis Storage.
- When all process is completed you should be redirected back to ikas Dashboard.

### Close App Loader

- At the ikas Dashboard, you will see a loader to close that loader we need to use ikas AppBridge to tell ikas Dashboard to close the loader that overlays the App IFrame.
- To close the loader you just need to add `AppBridgeHelper.closeLoader()` function to your component mount hook.

```typescript
import { AppBridgeHelper } from '@ikas/app-helpers';
AppBridgeHelper.closeLoader();
```
Copy

- If you see the authorize store page within the ikas Dashboard then it means you successfully authorized your page to a store.
