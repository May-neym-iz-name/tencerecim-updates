<!-- kaynak: https://ikas.dev/docs/theme/example-theme/product-detail/title -->

# Title

Title sub-component displays the product name.
src/components/product-detail/detail/title/index.tsx

```tsx
export const Title = (props: ProductDetailProps) => {
  return <S.Title>{props.product.name}</S.Title>;
};
```
Copy
