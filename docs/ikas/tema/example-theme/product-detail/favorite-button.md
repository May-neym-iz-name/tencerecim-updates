<!-- kaynak: https://ikas.dev/docs/theme/example-theme/product-detail/favorite-button -->

# Favorite Button

The merchants can add products to their favorites list.
This sub-component contains all the logic to add a product to favorites list.
src/components/product-detail/detail/favorite-button/index.tsx

```tsx
export const FavoriteButton = observer(({ product }: ProductDetailProps) => {
  const { t } = useTranslation();
  const { isProductFavorite, showLoginModal, pending, toggleFavorite } = useFavorite({
    productId: product.id,
  });

  const tooltipText = isProductFavorite
    ? t(`${NS}:detail.favorite.tooltipText.remove`)
    : t(`${NS}:detail.favorite.tooltipText.add`);

  return (
    <>
      <S.FavoriteButton disabled={pending} onClick={toggleFavorite}>
        <Tooltip noCursor text={tooltipText} placement="left">
          {pending && <Loading />}
          {!pending && <FavoriteSVG fill={isProductFavorite} />}
        </Tooltip>
      </S.FavoriteButton>
    </>
  );
});
```
Copy

We created a custom hook useFavorite
to seperate the favorites logic into its own function.
In this hook we use the following functions from the Customer Store;

- isProductFavorite to check if the product is already in favorites list.
- addProductToFavorites to add the product to the favorites list.
- removeProductFromFavorites to remove the product to the favorites list.
Since adding a product to favorites is an operation that requires a logged-in customer,
we also check the customer store to see if there is a logged-in customer,
and show a login modal to let the merchant login quickly if they are not already logged-in.
