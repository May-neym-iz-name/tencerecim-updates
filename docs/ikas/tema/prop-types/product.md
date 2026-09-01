<!-- kaynak: https://ikas.dev/docs/theme/prop-types/product -->

# Product

Product prop type allows the merchants to select a product for your component.
The merchant can either select a specific product, or they can use the current product of the page.
The checkbox `Use the product of the page` will only be visible if your component is added to the `Product Page`, so that the merchants can
provide the page's product dynamically to your component. However, if your component is added to a page other than
the `Product Page`, this checkbox will not be visible, and merchants will have to select a specific product manually.

```tsx
export type ProductExampleProps = {
    ...
    product: IkasProduct;
};
```
Copy

The prop value you get is an instance of IkasProduct.
Eveything you need to render a product can be found within this class. Providing information for each field
for the product in a single page can be daunting. That is why we suggest you to first check the
IkasProduct reference. Then you can check the usage
of this class from the Example Theme page.
