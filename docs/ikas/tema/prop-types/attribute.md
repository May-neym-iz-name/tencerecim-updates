<!-- kaynak: https://ikas.dev/docs/theme/prop-types/attribute -->

# Attribute

Attribute prop type allows you to display a specific attribute of a specific product.
Attributes allows the merchants to add more features to their products.
Before going into the details about the attribute prop type,
it is recommended for you to first learn more about the attributes themselves.
You can check the Product Attribute page for more information.
The prop value you get is an instance of IkasAttributeDetail.
You can use the `values` field of this class to render the attribute values.
You can check the usage of this class from the Example Theme page.

```tsx
export type AttributeTestProps = {
  ... your other props
  attribute: IkasAttributeDetail;
}
```
Copy

The `Use the product of the page` checkbox only appears if your component is added to the `Product Page`.
If this checkbox is checked, the product of the current page will be selected.
