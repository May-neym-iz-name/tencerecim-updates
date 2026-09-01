<!-- kaynak: https://ikas.dev/docs/theme/prop-types/brand-list -->

# Brand List

Brand list prop type allows you to display multiple brands in your components.
These brands can either be manually selected by the merchants, or can be fetched for you from the API automatically.
There are 2 types of brand list, each explained below.
The prop value you get is an instance of IkasBrandList.
The `data` field inside this class will contain an array of IkasBrand.
You can check the IkasBrandList reference for more info.

```tsx
export type BrandListExampleProps = {
    ...
    brandList: IkasBrandList;
};
```
Copy

## All
The type `All` of the brand list allows you to display all brands of the merchant,
with pagination functions (getNext, getPrev, getPage) provided by the IkasBrandList class.
Initial page of the brands will automatically be fetched for you on the server side.
Merchants can also select the `Initial Sort` and `Initial Limit` for the sort type and page size.

## Static
The type `Static` of the brand list allows the merchants to select specific brands.
Since the list is static, you won't be needing any pagination functions, and only display the
provided brands. Currently we do not provide a limit to the amount of brands to be added.
You can however, limit the brands rendered inside your components.
