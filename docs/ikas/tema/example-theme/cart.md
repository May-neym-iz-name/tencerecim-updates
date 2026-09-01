<!-- kaynak: https://ikas.dev/docs/theme/example-theme/cart -->

# Cart

Every theme should have a way of displaying the cart information.
ikas themes have a specific Cart Page (/cart),
and we created a Cart Component
to be used in that page.
Here is how this component looks like.
To render this component we use the IkasCartStore.
The useStore hooks gives you access to the IkasBaseStore,
and we use the cartStore from the base store. cart field (IkasCart) of the cart store contains our cart.
src/components/cart/index.tsx

```tsx
const Items = observer(() => {
  const store = useStore();
  return (
    <S.Items>
      {store.cartStore.cart?.items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
    </S.Items>
  );
});
```
Copy

cartStore.cart field contains everything you need to render this component. Formatted prices, item quantities,
product option values etc., everything you need should be in this class.
You can use the saveCouponCode and removeCouponCode
functions of the cart store to allow the merchants to add coupon codes.
You can use the cartStore.checkoutUrl to redirect the merchants to the checkout.
Check our theme's Cart Component
code and see how all these fields are being used in action.
