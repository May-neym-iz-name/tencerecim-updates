<!-- kaynak: https://ikas.dev/docs/theme/api/stores/ikas-cart-store -->

# IkasCartStore

`cart`IkasCart | null | undefined

Refer to the IkasCart reference.

`isLoadingCart`boolean

`isCartLoadFinished`boolean

`checkoutId`boolean

`checkoutUrl`boolean

`addItem`function
Adds a new item to the cart. If the cart is empty, a new cart will be created.

```typescript
async addItem( variant: IkasProductVariant, product: IkasProduct, initialQuantity = 1 )
```
Copy

variant
:
IkasProductVariant

product
:
IkasProduct

initialQuantity
:
number

`changeItemQuantity`function
Changes the quantity of a cart item to the provided quantity.

```typescript
async changeItemQuantity( item: IkasOrderLineItem, quantity: number )
```
Copy

item
:
IkasOrderLineItem

quantity
:
number

`removeItem`function

```typescript
async removeItem(item: IkasOrderLineItem)
```
Copy

item
:
IkasOrderLineItem

`findExistingItem`function
Finds the existing item from the cart items. This function also takes product option values into account, it is recommended to use this function instead of searching the cart items array manually.

```typescript
async findExistingItem(variant: IkasProductVariant, product: IkasProduct)
```
Copy

variant
:
IkasProductVariant

product
:
IkasProduct

`removeCart`function

```typescript
removeCart()
```
Copy

`saveCart`function
For normal cart operations like adding/removing items, you wouldnt need this function. However for more advanced scenarios, you can use this function save the cart.

```typescript
async saveCart(cart: IkasCart)
```
Copy

cart
:
IkasCart

`getCart`function
Cart data is automatically being fetched for you in the cartStore, but this function is also provided for more advanced scenarios. This functions sets the cart field in the cartStore.

```typescript
async getCart()
```
Copy

`saveCouponCode`function

```typescript
async saveCouponCode(couponCode?: string | null)
```
Copy

couponCode
:
string | null

`removeCouponCode`function

```typescript
async removeCouponCode()
```
Copy

`waitUntilInitialized`function
Use this function to wait for the cart store initialization. The cart field will be filled if available.

```typescript
waitUntilInitialized()
```
Copy
