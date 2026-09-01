<!-- kaynak: https://ikas.dev/docs/theme/api/stores/ikas-customer-store -->

# IkasCustomerStore

`customer`IkasCustomer | null | undefined

Refer to the IkasCustomer reference.

`initialized`boolean

`true` if the store is successfully initialized.

`customerConsentGranted`boolean

`true` if the customer accepted the cookies.

`isCaptchaRequired`boolean

There are several operations that might require captcha validation.
The ikas merchant can select from the dashboard to utilize captcha or not.
If the merchant prefers to use captcha, this field will return `true`.

`socialLogin`function
Initiates the social login flow, by redirecting the customer to the appropriate provider's URL.

```typescript
async socialLogin(provider: "facebook" | "google")
```
Copy

provider
:
"facebook" | "google"

`socialLoginToken`function
Performs login with the token received from the social login provider.

```typescript
async socialLoginToken(token: string)
```
Copy

token
:
string

`refundOrder`function

```typescript
async refundOrder(order: IkasOrder)
```
Copy

order
:
IkasOrder

`login`function

```typescript
async login(email: string, password: string)
```
Copy

email
:
string

password
:
string

`logout`function

```typescript
logout()
```
Copy

`register`function

```typescript
async register( firstName: string, lastName: string, email: string, password: string, isMarketingAccepted?: boolean, attributes?: IkasCustomerAttributeValue[] )
```
Copy

firstName
:
string

lastName
:
string

email
:
string

isMarketingAccepted
:
boolean | undefined

attributes
:
IkasCustomerAttributeValue[] | undefined

`saveContactForm`function

```typescript
async saveContactForm(input: IkasContactForm)
```
Copy

input
:
IkasContactForm

`checkEmail`function

```typescript
async checkEmail(email: string)
```
Copy

email
:
string

`forgotPassword`function

```typescript
async forgotPassword(email: string)
```
Copy

email
:
string

`recoverPassword`function

```typescript
async recoverPassword(password: string, passwordAgain: string, token: string)
```
Copy

password
:
string

passwordAgain
:
string

token
:
string

`saveCustomer`function

```typescript
async saveCustomer(customer: IkasCustomer)
```
Copy

customer
:
IkasCustomer

`getOrders`function
List orders of the currently logged-in customer.

```typescript
async getOrders()
```
Copy

`getOrder`function
Get a specific customer order by id.

```typescript
async getOrder(id: string)
```
Copy

`getOrderByEmail`function
Get a specific customer order by email and orderNumber.

```typescript
async getOrderByEmail(email: string, orderNumber: string)
```
Copy

`getOrderTransactions`function
Get payment transactions of an order.

```typescript
async getOrderTransactions(params: { checkoutId?: string; id?: string; orderId?: string; } = {})
```
Copy

params
:
{checkoutId?: string; id?: string; orderId?: string;}

`getFavoriteProductsIds`function

```typescript
async getFavoriteProductsIds()
```
Copy

`getFavoriteProducts`function

```typescript
async getFavoriteProducts()
```
Copy

`addProductToFavorites`function

```typescript
async addProductToFavorites(productId: string)
```
Copy

`removeProductFromFavorites`function

```typescript
async removeProductFromFavorites(productId: string)
```
Copy

`isProductFavorite`function

```typescript
async isProductFavorite(productId: string)
```
Copy

`createEmailSubscription`function
Subscribe to the newsletter/marketing notifications.

```typescript
async createEmailSubscription(email: string)
```
Copy

`sendReview`function

```typescript
async sendReview(input: IkasCustomerReviewForm)
```
Copy

`onCustomerConsentGrant`function
Callback to call when the customer accepts the cookies.

```typescript
onCustomerConsentGrant()
```
Copy

`waitUntilInitialized`function
Use this function to wait for the customer store initialization. The customer field will be filled if the customer is logged-in.

```typescript
waitUntilInitialized()
```
Copy

`waitUntilCaptchaTokenInitialized`function

```typescript
waitUntilCaptchaTokenInitialized()
```
Copy

`getCustomerAttributes`function

```typescript
async getCustomerAttributes()
```
Copy
