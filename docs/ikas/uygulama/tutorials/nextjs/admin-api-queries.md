<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/admin-api-queries -->

# Admin API Queries

### Get Authorized App
By using `getAuthorizedApp` ikas adminApi, you can get authorizedApp.
info
Go the queries page to see what parameters the getAuthorizedApp adminApi request takes.

File: pages/api/ikas/get-authorized-app.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { AuthorizedApp } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type GetAuthorizedApiResponse = {
  authorizedApp?: AuthorizedApp;
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<GetAuthorizedApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    // req.user is guaranteed by ensureLoggedIn middleware
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    const response = await ikas.adminApi.queries.getAuthorizedApp({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res
        .status(500)
        .json({ statusCode: 500, message: response.errors[0].message || 'Failed to get authorized app' });
    }

    if (response.data?.getAuthorizedApp) {
      res.status(200).json({ authorizedApp: response.data.getAuthorizedApp });
    } else {
      console.error('Unexpected response structure or no data found.');
      res.status(404).json({ statusCode: 404, message: 'Authorized app data not found' });
    }
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

### Get Merchant
By using `getMerchant` ikas adminApi, you can get merchant.
info
Go the queries page to see what parameters the getMerchant adminApi request takes.

File: pages/api/ikas/get-merchant.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { Merchant } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type GetMerchantApiResponse = {
  merchant?: Merchant;
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<GetMerchantApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    const response = await ikas.adminApi.queries.getMerchant({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res.status(500).json({ statusCode: 500, message: response.errors[0].message || 'Failed to get merchant' });
    }

    if (response.data?.getMerchant) {
      res.status(200).json({ merchant: response.data.getMerchant });
    } else {
      console.error('Unexpected response structure or no merchant data found.');
      res.status(404).json({ statusCode: 404, message: 'Merchant data not found' });
    }
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

### List App Payments
By using `listMerchantAppPayment` ikas adminApi, you can get app payment lists.
info
Go the queries page to see what parameters the listMerchantAppPayment adminApi request takes.

File: pages/api/ikas/list-app-payments.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { MerchantAppPayment } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type ListAppPaymentsApiResponse = {
  merchantAppPayments?: MerchantAppPayment[];
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<ListAppPaymentsApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    // Add any necessary filter/pagination parameters here if needed
    const response = await ikas.adminApi.queries.listMerchantAppPayment({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res
        .status(500)
        .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list app payments' });
    }

    // Check if the data structure is as expected
    if (response.data?.listMerchantAppPayment?.results) {
      res.status(200).json({ merchantAppPayments: response.data.listMerchantAppPayment.results });
    } else {
      console.error('Unexpected response structure or no payments found.');
      // Return empty list if results are simply missing but no error occurred
      res.status(200).json({ merchantAppPayments: [] });
    }
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

### List Category
By using `listCategory` ikas adminApi, you can get category list.
info
Go the queries page to see what parameters the listCategory adminApi request takes.

File: pages/api/ikas/list-category.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { Category } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type ListCategoryApiResponse = {
  categories?: Category[];
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<ListCategoryApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    // Add any necessary filter/pagination parameters here if needed
    const response = await ikas.adminApi.queries.listCategory({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res
        .status(500)
        .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list categories' });
    }

    if (response.data?.listCategory?.results) {
      res.status(200).json({ categories: response.data.listCategory.results });
    } else {
      console.error('Unexpected response structure or no categories found.');
      res.status(200).json({ categories: [] });
    }
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

### List Customers
We will use `listCustomer` API when we want to sort the customers.
We will list and paginate through ikas customers.
info
Go the queries page to see what parameters the listCustomer adminApi request takes.

File: pages/api/ikas/list-customers.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { PaginationInput, CustomerPaginationResponse } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type CustomersApiRequest = {
  pagination?: PaginationInput;
};

// Combine response type with error type
export type CustomersApiResponse = Partial<CustomerPaginationResponse> & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<CustomersApiResponse>>();

router
  .use(ensureLoggedIn)
  // Changed to POST to accept body for pagination/filter/sort details
  .post(async (req, res) => {
    try {
      // Cast request body
      const { pagination } = req.body as CustomersApiRequest;

      const token = await RedisDB.token.get(req.user!.authorizedAppId);
      if (!token) {
        return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
      }

      const ikas = getIkas(token);
      const response = await ikas.adminApi.queries.listCustomer({
        // Pass pagination from request body or default
        pagination: pagination || {
          page: 1,
          limit: 10,
        },
        sort: '-createdAt',
        // Add filters here if needed
      });

      if (response.errors && response.errors.length > 0) {
        console.error('GraphQL Errors:', response.errors);
        return res
          .status(500)
          .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list customers' });
      }

      if (response.data?.listCustomer) {
        res.status(200).json(response.data.listCustomer);
      } else {
        console.error('Unexpected response structure or no customer data found.');
        // Return default empty pagination structure
        res.status(200).json({ results: [], count: 0, total: 0, page: 1, limit: 10 });
      }
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

### List Orders
By using `listOrders` ikas adminApi, you can get orders.
info
Go the queries page to see what parameters the listOrders adminApi request takes.

File: pages/api/ikas/list-orders.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { PaginationInput, OrderPaginationResponse } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type OrdersApiRequest = {
  pagination?: PaginationInput;
};

export type OrdersApiResponse = Partial<OrderPaginationResponse> & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<OrdersApiResponse>>();

router
  .use(ensureLoggedIn)
  // Changed to POST to accept body for pagination/filter/sort details
  .post(async (req, res) => {
    try {
      const { pagination } = req.body as OrdersApiRequest;

      const token = await RedisDB.token.get(req.user!.authorizedAppId);
      if (!token) {
        return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
      }

      const ikas = getIkas(token);
      const response = await ikas.adminApi.queries.listOrder({
        pagination: pagination || {
          page: 1,
          limit: 10,
        },
        sort: '-createdAt',
        // Add filters here if needed
      });

      if (response.errors && response.errors.length > 0) {
        console.error('GraphQL Errors:', response.errors);
        return res
          .status(500)
          .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list orders' });
      }

      if (response.data?.listOrder) {
        res.status(200).json(response.data.listOrder);
      } else {
        console.error('Unexpected response structure or no order data found.');
        res.status(200).json({ results: [], count: 0, total: 0, page: 1, limit: 10 });
      }
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

### List Price List
By using `listPriceList` ikas adminApi, you can get price list.
info
Go the queries page to see what parameters the listPriceList adminApi request takes.

File: pages/api/ikas/list-pricelist.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { PriceList } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type ListPriceListApiResponse = {
  priceLists?: PriceList[];
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<ListPriceListApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    const response = await ikas.adminApi.queries.listPriceList({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res
        .status(500)
        .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list price lists' });
    }

    if (response.data?.listPriceList?.results) {
      res.status(200).json({ priceLists: response.data.listPriceList.results });
    } else {
      console.error('Unexpected response structure or no price lists found.');
      res.status(200).json({ priceLists: [] });
    }
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

### List Products
We completed the authorization process Now we can use ikas APIs in our app.
First API that we will use is the `listProduct` API.
We will list and paginate through ikas products.
info
Go the queries page to see what parameters the listProduct adminApi request takes.

File: pages/api/ikas/list-products.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { PaginationInput, ProductPaginationResponse } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type ProductsApiRequest = {
  pagination?: PaginationInput;
};

export type ProductsApiResponse = Partial<ProductPaginationResponse> & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<ProductsApiResponse>>();

router
  .use(ensureLoggedIn)
  // Changed to POST to accept body for pagination/filter/sort details
  .post(async (req, res) => {
    try {
      const { pagination } = req.body as ProductsApiRequest;

      const token = await RedisDB.token.get(req.user!.authorizedAppId);
      if (!token) {
        return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
      }

      const ikas = getIkas(token);
      const response = await ikas.adminApi.queries.listProduct({
        pagination: pagination || {
          page: 1,
          limit: 10,
        },
        // Add filters/sort here if needed
      });

      if (response.errors && response.errors.length > 0) {
        console.error('GraphQL Errors:', response.errors);
        return res
          .status(500)
          .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list products' });
      }

      if (response.data?.listProduct) {
        res.status(200).json(response.data.listProduct);
      } else {
        console.error('Unexpected response structure or no product data found.');
        res.status(200).json({ results: [], count: 0, total: 0, page: 1, limit: 10 });
      }
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

### List Sales Channel
By using `listSalesChannel` ikas adminApi, you can get sales channel list.
info
Go the queries page to see what parameters the listSalesChannel adminApi request takes.

File: pages/api/ikas/list-sales-channel.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { SalesChannel } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type SalesChannelApiResponse = {
  salesChannels?: SalesChannel[];
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<SalesChannelApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    const response = await ikas.adminApi.queries.listSalesChannel({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res
        .status(500)
        .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list sales channels' });
    }

    if (response.data?.listSalesChannel?.results) {
      res.status(200).json({ salesChannels: response.data.listSalesChannel.results });
    } else {
      console.error('Unexpected response structure or no sales channels found.');
      res.status(200).json({ salesChannels: [] });
    }
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

### List Stock Location
By using `listStockLocation` ikas adminApi, you can get stock location list.
info
Go the queries page to see what parameters the listStockLocation adminApi request takes.

File: pages/api/ikas/list-stock-location.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { StockLocation } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type ListStockLocationApiResponse = {
  stockLocations?: StockLocation[];
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<ListStockLocationApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    const response = await ikas.adminApi.queries.listStockLocation({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res
        .status(500)
        .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list stock locations' });
    }

    if (response.data?.listStockLocation?.results) {
      res.status(200).json({ stockLocations: response.data.listStockLocation.results });
    } else {
      console.error('Unexpected response structure or no stock locations found.');
      res.status(200).json({ stockLocations: [] });
    }
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

### List Storefront
By using `listStorefront` ikas adminApi, you can get storefront list.
info
Go the queries page to see what parameters the listStorefront adminApi request takes.

File: pages/api/ikas/list-storefront.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { Storefront } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type ListStorefrontApiResponse = {
  storefronts?: Storefront[];
} & ApiErrorResponse;

const router = createRouter<NextApiRequest, NextApiResponse<ListStorefrontApiResponse>>();

router.use(ensureLoggedIn).get(async (req, res) => {
  try {
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid token' });
    }

    const ikas = getIkas(token);
    const response = await ikas.adminApi.queries.listStorefront({});

    if (response.errors && response.errors.length > 0) {
      console.error('GraphQL Errors:', response.errors);
      return res
        .status(500)
        .json({ statusCode: 500, message: response.errors[0].message || 'Failed to list storefronts' });
    }

    if (response.data?.listStorefront?.results) {
      res.status(200).json({ storefronts: response.data.listStorefront.results });
    } else {
      console.error('Unexpected response structure or no storefronts found.');
      res.status(200).json({ storefronts: [] });
    }
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
