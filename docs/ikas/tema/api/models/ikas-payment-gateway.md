<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-payment-gateway -->

# IkasPaymentGateway extends IkasBaseModel

`additionalPrices`IkasPaymentGatewayAdditionalPrice[] | null

Refer to the IkasPaymentGatewayAdditionalPrice reference.

`availableCountries`string[] | null

`code`string

`description`string | null

`logoUrl`string | null

`masterPassClientId`string | null

`name`string

`paymentGatewayProviderId`string | null

`supportedCurrencies`string[] | null

`testMode`boolean | null

`type`IkasPaymentGatewayType

Refer to the IkasPaymentGatewayType reference.

`paymentMethods`IkasPaymentMethod[]

Refer to the IkasPaymentMethod reference.

`paymentMethodType`IkasPaymentMethodType

Refer to the IkasPaymentMethodType reference.

`settings`IkasPaymentGatewaySettings[] | null

Refer to the IkasPaymentGatewaySettings reference.

`translations`IkasPaymentGatewayTranslation[] | null

Refer to the IkasPaymentGatewayTranslation reference.

`getCalculatedAdditionalPrices`function

```typescript
function getCalculatedAdditionalPrices(totalFinalPrice: number, shippingLines: IkasOrderShippingLine[] | null): { name: string; amount: number; type: IkasPaymentGatewayAdditionalPriceType; }[] | undefined
```
Copy

totalFinalPrice
:
number

shippingLines
:
IkasOrderShippingLine[] | null
