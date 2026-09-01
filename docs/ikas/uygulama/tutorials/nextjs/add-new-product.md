<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/add-new-product -->

# Add New Product

To add a product, click the "Add Product" button on the app page.
warning
`product_created` must be added in the scope.

- First create a folder named `ikas` inside `pages/api` folder.
- Then create a file named `add-product.ts` inside `pages/api/ikas` folder.
Your file structure should be like this:

pages

Now we are ready to implement our first API in our app. Open the `add-product.ts` and paste the following code to it.
File: pages/api/ikas/add-product.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { ensureLoggedIn } from '@/lib/ensure-logged-in';
import { getIkas } from '@/lib/ikas-api';
import { RedisDB } from '@/lib/redis';
import { Product, ProductTypeEnum } from '@ikas/api-client';
import { ApiErrorResponse } from '@/globals/types';

export type AddProductApiRequest = {
  name: string;
  sellPrice: number;
  discountPrice?: number;
};

export type AddProductApiResponse = Partial<Product>;

const router = createRouter<NextApiRequest, NextApiResponse<AddProductApiResponse | ApiErrorResponse>>();

/**
 * This api creates simple product on ikas with name, sellPrice and discountPrice
 */
router.use(ensureLoggedIn).post(async (req, res) => {
  try {
    const data = req.body as AddProductApiRequest;
    const token = await RedisDB.token.get(req.user!.authorizedAppId);
    if (token) {
      const ikas = getIkas(token);
      const productsRes = await ikas.adminApi.mutations.saveProduct({
        variables: {
          input: {
            name: data.name,
            type: ProductTypeEnum.PHYSICAL,
            variants: [
              {
                prices: [
                  {
                    discountPrice: data.discountPrice,
                    sellPrice: data.sellPrice,
                  },
                ],
              },
            ],
          },
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
    addProduct: (data: AddProductApiRequest, token: string) =>
      makePostRequest<AddProductApiResponse>({ url: '/api/ikas/add-product', data, token }),
  },
};
```
Copy

In the ApiRequests object, we add the products function. This function is used to send the post request to the API.
For example; Let's want to add product on the dashboard page. For this, we create a function called onSaveProduct. Then we call the code that we add to the api-request here.
File: app/dashboard/page.tsx

```typescript
const onSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  try {
    if (token) {
      const res = await ApiRequests.ikas.addProduct(newProduct, token);
      if (res.status == 200 && res.data) {
        setNewProduct({ name: '', sellPrice: 0 });
        toggleModal();
        await loadProducts(1);
      }
    }
  } finally {
  }
};
```
Copy

#### Let's explain the code:

- `AddProductApiRequest` is the type of the data we send to the API. In this case, we send the product data to the API.
- `AddProductApiResponse` is the type of the data we receive from the API. In this case, we receive the product data from the API.
- In the `handler` function, we first check if the user is logged in. If the user is logged in, we get the token from the RedisDB and send it to the ikas API. Then we create the product on the API and return it to the client.
