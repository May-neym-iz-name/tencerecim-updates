<!-- kaynak: https://ikas.dev/docs/theme/prop-types/product-list -->

# Product List

Product list prop type allows you to display multiple products in your components.
These products can either be manually selected by the merchant, or can be fetched for you from the API automatically.
There are several types of product list, each explained below.
The prop value you get is an instance of IkasProductList.
Eveything you need to display a list of products, including the pagination, filtering and search functions
can be found within this class.
The `data` field inside this class will contain an array of IkasProduct.
Providing information for each field
for the product list in a single page can be daunting. That is why we suggest you to first check the
IkasProductList reference. Then you can check the usage
of this class from the Example Theme page.

```tsx
export type ProductListExampleProps = {
    ...
    productList: IkasProductList;
};
```
Copy

## All
The type `All` of the product list allows you to display all products of the merchant,
with pagination functions (getNext, getPrev, getPage) provided by the IkasProductList class.
Initial page of the products will automatically be fetched for you on the server side.
Merchants can also select the `Initial Sort` and `Initial Limit` for the sort type and page size.
The `Use page data as filter` checkbox, will only be visible if your component is added to the `Category Page`
or `Brand Page`. If the merchant checks this checkbox inside these pages, then the product list will automatically
be filtered by the current page's category or brand.

## Static
The type `Static` of the product list allows the merchants to select specific products.
Since the list is static, you won't be needing any pagination functions, and only display the
provided products. Currently we do not provide a limit to the amount of products to be added.
You can however, limit the products rendered inside your components.

## Category Products
The type `Category Products` of the product list allows the merchant to select all products that
belongs to a specific category.

## Search
The type `Search` of the product list has almost the same functionality with the All type.
The only difference of the `Search` type is that, it doesn't fetch the first page of the products
automatically.
It only fetches the products when you set the `searchKeyword` field of your IkasProductList.
This type should be used for the search inputs inside the header components.

## Last Viewed Products
The type `Last Viewed Products` is pretty self explanatory. The products visited by the customer
are being saved automatically, and this type will allow you to access those products.
It is only a single page of products, so you don't need to fetch the next page with the pagination functions.

## Related Products
The type `Related Products` will only be visible if your component is added to a `Product Page`.
It will allow you to access related products of the currently displayed product inside the `Product Page`.
It also allows the merchants to select how to find related products, this can either be the products with the same brand
or the same category.
