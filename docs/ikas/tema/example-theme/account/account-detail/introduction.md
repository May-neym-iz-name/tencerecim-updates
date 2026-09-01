<!-- kaynak: https://ikas.dev/docs/theme/example-theme/account/account-detail/introduction -->

# Introduction

Account detail components are the components that require a logged-in
customer. They display information specific to the logged-in customer account.
Since most of these sub-components share the same layout in our theme's design,
we created a parent AccountPage
component. Here is how this component looks like;
The layout this component creates is a left navigation menu, and a component
to display contents of the link on the right side.

```tsx
const AccountPage = () => {
  const { hasCustomer, isAccount, isFavoriteProducts, isAddresses, isOrderDetail, isOrders } = useAccount();

  if (!hasCustomer) return null;
  return (
    <Container>
      <S.InnerWrapper>
        <Menu />
        <S.Main>
          {isAccount && <AccountInfo />}
          {isAddresses && <Address />}
          {isFavoriteProducts && <FavoriteProducts />}
          {isOrders && <Orders />}
          {isOrderDetail && <OrderDetail />}
        </S.Main>
      </S.InnerWrapper>
    </Container>
  );
};
```
Copy

We check which page we are currently on with the store.currentPageType field in the
useAccount
custom hook. Depending on the page, we render the appropriate component for that page.
Here are all the sub-components;

- AccountInfo
- FavoriteProducts
- Orders
- OrderDetail
