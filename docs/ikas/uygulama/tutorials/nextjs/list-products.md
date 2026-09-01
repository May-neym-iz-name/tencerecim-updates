<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/list-products -->

# List Products

After successfully installing the application, you will see a screen like the one below:
On this application page, we can list the products that we have added from the admin panel or that we have added to the database by clicking the Add Product button.

- First create a folder named `ikas` inside `pages/api` folder.
- Then create a file named `products.ts` inside `pages/api/ikas` folder.
Your file structure should be like this:

pages

Now we are ready to implement our first API in our app. Open the `products.ts` and paste the following code to it.
File: pages/api/ikas/products.ts

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

export type ProductsApiResponse = Partial<ProductPaginationResponse>;

const router = createRouter<NextApiRequest, NextApiResponse<ProductsApiResponse | ApiErrorResponse>>();

/**
 * This api queries paginated product list from ikas and returns it to the client
 */
router.use(ensureLoggedIn).post(async (req, res) => {
  try {
    const data = req.body as ProductsApiRequest;
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (token) {
      const ikas = getIkas(token);
      const productsRes = await ikas.adminApi.queries.listProduct({
        variables: {
          pagination: data.pagination || {
            page: 1,
            limit: 10,
          },
          sort: '-createdAt',
        },
      });

      if (productsRes.isSuccess && productsRes.data) res.status(200).json(productsRes.data);
    }
    res.status(400).json({ statusCode: 400, message: 'Bad Request' });
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

#### Update `api-requests.ts`
Now we need to add our API to ApiRequests object, so we can use it on client-side.

- Open the `api-requests.ts` file and update ApiRequests object with the code below:
File: lib/api-request.ts

```typescript
export const ApiRequests = {
  ikas: {
    products: (data: ProductsApiRequest, token: string) =>
      makePostRequest<ProductsApiResponse>({ url: '/api/ikas/products', data, token }),
  },
};
```
Copy

In the ApiRequests object, we add the products function. This function is used to send the post request to the API.
For example; Let's want to list the products on the dashboard page. For this, we create a function called loadProdcucts. Then we call the code that we add to the api-request here. In this way, we list the products.
File: app/dashboard/page.tsx

```typescript
const loadProducts = async (page: number) => {
  setLoading(true);
  try {
    if (token) {
      const res = await ApiRequests.ikas.products(
        {
          pagination: {
            page, // page number
            limit: 10, // 10 products per page
          },
        },
        token,
      );
      if (res.status == 200 && res.data) {
        const data = res.data as ProductsApiResponse;
        setProducts(data);
      }
    }
  } finally {
    setLoading(false);
  }
};
```
Copy

#### Let's explain the code:

- `ProductsApiRequest` is the type of the data we send to the API. In this case, we send the pagination data to the API.
- `ProductsApiResponse` is the type of the data we receive from the API. In this case, we receive the pagination data from the API.
- In the `handler` function, we first check if the user is logged in. If the user is logged in, we get the token from the RedisDB and send it to the ikas API. Then we get the products from the API and return it to the client.
