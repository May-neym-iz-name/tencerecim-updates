<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-order-address -->

# IkasOrderAddress

`id`string | null

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

`country`IkasOrderAddressCountry | null

Refer to the IkasOrderAddressCountry reference.

`state`IkasOrderAddressState | null

Refer to the IkasOrderAddressState reference.

`city`IkasOrderAddressCity | null

Refer to the IkasOrderAddressCity reference.

`district`IkasOrderAddressDistrict | null

Refer to the IkasOrderAddressDistrict reference.

`checkoutSettings`IkasCheckoutSettings | null

Refer to the IkasCheckoutSettings reference.

`isDistrictRequired`boolean

`addressText`string

`validationResult`IkasOrderAddressFunctions.IkasOrderAddressValidationResult | undefined

`isValid`boolean

`toJSON`function

```typescript
function toJSON(): Object
```
Copy
