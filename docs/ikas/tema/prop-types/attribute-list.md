<!-- kaynak: https://ikas.dev/docs/theme/prop-types/attribute-list -->

# Attribute List

Attribute list prop type allows you to display multiple attributes at the same time.
As stated before in the Attribute prop type,
it is recommended for you to first learn more about the attributes themselves.
You can check the Product Attribute page for more information.
The prop value you get is an instance of IkasAttributeList.
You can use the `values` field of this class to render the attribute values.
You can check the usage of this class from the Example Theme page.

```tsx
export type AttributeListTestProps = {
  ... your other props
  attributeList: IkasAttributeList;
}
```
Copy

The `Use the product of the page` checkbox only appears if your component is added to the `Product Page`.
If this checkbox is checked, the product of the current page will be selected.
