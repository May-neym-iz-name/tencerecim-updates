<!-- kaynak: https://ikas.dev/docs/theme/example-theme/product-detail/price -->

# Price

Price sub-component displays the price information of the product.
src/components/product-detail/detail/price/index.tsx

```tsx
export const Price = observer((props: ProductDetailProps) => {
  const { price } = props.product.selectedVariant;
  return (
    <S.PriceWrapper>
      {price.hasDiscount && <S.SellPrice>{price.formattedSellPrice}</S.SellPrice>}
      <S.Price>{price.formattedFinalPrice}</S.Price>
    </S.PriceWrapper>
  );
});
```
Copy

Price information can be found in the selectedVariant field,
which is an instance of the IkasProductVariant class.
price field of the selectedVariant provides us with all the price data.
We first use the hasDiscount field to show the actual price before the discount, formattedSellPrice.
We then use the formattedFinalPrice to show the actual price after all discounts applied.
warning
Price data also has the number versions of the prices, like sellPrice or finalPrice.
We use the formatted versions to display the price.
The formatting rules for these prices are being decided by the ikas merchant
from the dashboard. Whenever you need to display a price information,
always look for the formatted versions and do not format them yourself.
Otherwise, the merchant's currency formatting preferences from the dashboard would be discarded.
If you want to format a price with the merchant's preferences, you can also use the
formatCurrency function exported from the @ikas/storefront package.
