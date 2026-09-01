<!-- kaynak: https://ikas.dev/docs/theme/example-theme/product-detail/add-to-cart -->

# Add to Cart

Logic of adding products to the cart is in this component.
Here is the full source code.
src/components/product-detail/detail/add-to-cart/index.tsx

```tsx
export const AddToCart = observer((props: ProductDetailProps) => {
  const [quantity, setQuantity] = useState(1);

  return (
    <S.Wrapper>
      <QuantityButton quantity={quantity} setQuantity={setQuantity} />
      <AddToCartButton product={props.product} quantity={quantity} />
      <BackInStock product={props.product} />
    </S.Wrapper>
  );
});
```
Copy

## Adding Items
To add products to the cart, we use the Cart Store.
We first check if the item already exists in the cart with the findExistingItem function.
The addItem function adds a new item to the cart, while the changeItemQuantity
function changes the quantity of an existing item.
src/utils/hooks/useAddToCart.tsx

```tsx
export function useAddToCart() {
  const [loading, setLoading] = useState(false);

  const addToCart = async (product: IkasProduct, quantity: number) => {
    const store = useStore();

    const item = store.cartStore.findExistingItem(product.selectedVariant, product);
    setLoading(true);
    if (item) {
      await store.cartStore.changeItemQuantity(item, item.quantity + quantity);
    } else {
      await store.cartStore.addItem(product.selectedVariant, product, quantity);
    }
    setLoading(false);
  };

  return {
    loading,
    addToCart,
  };
}
```
Copy

warning
Always use the findExistingItem function to check if an item exists in the cart. This function
checks the product option values as well. If you search for the item manually in the cart.items
array without taking product option values into account, you might get a wrong item.

note
You can also check the return types of addItem and changeItemQuantity functions
to inform the customers of any errors.

## Stock Check
Before adding items to the cart, we need to make sure that the product has sufficient stock.
We use the selectedVariant.hasStock field to check it. We also change the button's text,
depending on the stock status.
Customers can also subscribe for notifications, when a product is back in stock.
To provide this functionality, we use the following fields/functions from the selectedVariant.

- isBackInStockEnabled to check if this feature is enabled.
- isBackInStockReminderSaved to check if the customer already registered for notifications.
- isBackInStockCustomerLoginRequired to check if this feature should be enabled only for
logged-in customers, or guests as well. If the value is true, we make sure to login
the customer first. If the value is false, we ask the customer's email in a modal.
- saveBackInStockReminder to save the reminder.
Check the useBackInStock
source code for the full logic.
