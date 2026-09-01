<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-customer-address -->

# IkasCustomerAddress extends IkasBaseModel

`addressLine1`string

`addressLine2`string | null

`company`string | null

`firstName`string

`identityNumber`string | null

`isDefault`boolean

`lastName`string

`phone`string | null

`postalCode`string | null

`taxNumber`string | null

`taxOffice`string | null

`title`string

`attributes`IkasCustomerAttributeValue[] | null

Refer to the IkasCustomerAttributeValue reference.

`country`IkasCustomerAddressCountry | null

Refer to the IkasCustomerAddressCountry reference.

`state`IkasCustomerAddressState | null

Refer to the IkasCustomerAddressState reference.

`city`IkasCustomerAddressCity | null

Refer to the IkasCustomerAddressCity reference.

`district`IkasCustomerAddressDistrict | null

Refer to the IkasCustomerAddressDistrict reference.

`checkoutSettings`IkasCheckoutSettings | null

Refer to the IkasCheckoutSettings reference.

`isDistrictRequired`boolean

`addressText`string

`validationResult`IkasCustomerAddressFunctions.IkasCustomerAddressValidationResult | undefined

`isValid`boolean

`toJSON`function

```typescript
function toJSON(): Object
```
Copy
