<!-- kaynak: https://ikas.dev/docs/theme/example-theme/account/account-detail/orders -->

# Orders

Orders component lists the previous orders of the customer.
Here is the full source code.
Here is how our orders component looks like;
The logic for our orders component is in the
useOrders
custom hook. It uses the store.customerStore.getOrders() function to list the orders of the customer.
We have created a Order
sub-component to render each order list item.

```tsx
{
  !isPending && !!orders.length && (
    <S.Orders>
      {orders.map((order) => (
        <Order key={order.id} order={order} />
      ))}
    </S.Orders>
  );
}
```
Copy
