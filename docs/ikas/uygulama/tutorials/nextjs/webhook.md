<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/webhook -->

# Webhook

## What is a webhook?
In short, Webhook is the sending of a POST request at a specified URL if the targeted event occurs.

## How Webhooks Work in IKAS?
There are a total of 13 webhook scopes specified in IKAS. Webhook primarily becomes a subscriber on the backend. In this way,
instead of checking the system at regular intervals, the webhook is triggered immediately when there is a change in the backend.

### An Example Scenario
Wanted: If the user adds a product to their favorites, a reminder e-mail will be sent after 1 day.
Procedures to be applied in order::

- The user adds a product to their favorite cart.
- At this stage, the `CUSTOMER_FAVORITE_PRODUCTS_CREATED` webhook is triggered.
- The Webhook executes the code block it is attached to.
- In the code block, a cronjob runs, which sends a reminder mail after 1 day.

## Webhook Scopes in IKAS
There are 13 webhooks in IKAS. These webhooks scopes are listed in the table below.

| Webhook | Detail |

| ORDER_CREATED | It is triggered when an order is created by the customer. |
| ORDER_UPDATED | It is triggered when an order is updated by the customer. |
| PRODUCT_CREATED | It is triggered when a product is created by the admin. |
| PRODUCT_UPDATED | It is triggered when a product is updated by the admin. |
| PRODUCT_DELETED | Triggered when a product is deleted by the administrator. |
| CUSTOMER_CREATED | It is triggered when an account is created by the customer. |
| CUSTOMER_UPDATED | Triggered when an account is updated by the customer. |
| CUSTOMER_FAVORITE_PRODUCTS_CREATED | It is triggered when a product is added to the favorite cart by the customer. |
| CUSTOMER_FAVORITE_PRODUCTS_UPDATED | It is triggered when a product is updated in their favorite cart by the customer. |
| STOCK_CREATED | It is triggered when an inventory is created by the administrator. |
| STOCK_UPDATED | It is triggered when a stock is updated by the admin. |
| APP_DELETED | It is triggered when an app is deleted by the administrator. |
| APP_PAYMENT | It is triggered when the admin pays for an app. |

## Create a Webhook
warning
You need to add your webhook url address to the App Webhook Url field on the partner page. A webhook won't create without filling this field.

Before a webhook can be used, a webhook has to be saved. We use a mutation in the AdminApi to do this.

```typescript
await ikas.adminApi.mutations.saveWebhook({
  variables: {
    input: {
      scopes: [],
      endpoint: '',
      salesChannelIds: [],
    },
  },
});
```
Copy

SaveWebhook takes three values. These:

- scopes: Specifies the events to trigger the webhook. These webhook operations are given in the table above.
- endpoint: This is the URL to which the POST request will be sent if the webhook is triggered.
- salesChannelIds: Specifies the sales channels from which the webhook will be triggered.
info
In general, the webhook of all app is created during the callback process.

An Example Scenario
I want the app to trigger the Webhook when the user places an order or the order is updated.

```typescript
const ikas = getIkas(authToken);
await ikas.adminApi.mutations.saveWebhook({
  variables: {
    input: {
      scopes: [WebhookScope.ORDER_CREATED, WebhookScope.ORDER_UPDATED],
      endpoint: `${config.deployUrl}/api/ikas/webhook`,
      salesChannelIds: [],
    },
  },
});
```
Copy

In the above process, `ORDER_CREATED` and `ORDER_UPDATED` have been added to the `scopes` field. When these webhooks are triggered, a POST request will be sent to the URL address specified in the `endpoint` part.
The value in the endpoint is given from the environment file.File: .env

```env
NEXT_PUBLIC_APP_KEY = ...
APP_SECRET = ...
DEPLOY_URL = ...
```
Copy

The values given here are exported in the config file.
File: globals/config.ts

```typescript
export const config = {
  appId: process.env.NEXT_PUBLIC_APP_KEY || '',
  appSecret: process.env.APP_SECRET || '',
  scope: 'read_products,write_products',
  deployUrl: process.env.DEPLOY_URL || 'http://localhost:3000',
  callbackUrl: (process.env.DEPLOY_URL || 'http://localhost:3000') + '/api/oauth/callback',
};
```
Copy
