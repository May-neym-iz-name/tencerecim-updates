<!-- kaynak: https://ikas.dev/docs/theme/prop-types/brand -->

# Brand

Brand prop type allows you to display information about a brand.
The prop type you get is an instance of IkasBrand class.
The checkbox `Use the brand of the page`, will only be visible if your component is added to the `Brand Page`, so that the merchants can
provide the page's brand dynamically to your component. However, if your component is added to a page other than
the `Brand Page`, this checkbox will not be visible, and merchants will have to select a specific brand manually.

```tsx
export type BrandTestProps = {
  ... your other props
  brand: IkasBrand;
}
```
Copy
