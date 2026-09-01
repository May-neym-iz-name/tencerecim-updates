<!-- kaynak: https://ikas.dev/docs/theme/example-theme/product-detail/description -->

# Description

Product descriptions are provided by the ikas merchants from the dashboard.
The values of descriptions are in a HTML rich text format.
Use the dangerouslySetInnerHTML
prop to render the description.
src/components/product-detail/detail/description/index.tsx

```tsx
export const Description = (props: ProductDetailProps) => {
  const { t } = useTranslation();
  if (!props.product.description) return null;
  return (
    <S.DescriptionWrapper>
      <S.DescriptionTitle>{t(`${NS}:detail.description.title`)}</S.DescriptionTitle>
      <S.Description dangerouslySetInnerHTML={{ __html: props.product.description }} />
    </S.DescriptionWrapper>
  );
};
```
Copy
