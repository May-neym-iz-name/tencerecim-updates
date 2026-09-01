<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-product-variant -->

# IkasProductVariant

`id`string

`sku`string | null

`barcodeList`string[] | null

`variantValues`IkasVariantValue[]

Refer to the IkasVariantValue reference.

`attributes`IkasProductAttributeValue[]

Refer to the IkasProductAttributeValue reference.

`price`IkasProductPrice

Refer to the IkasProductPrice reference.

`stock`number

`isActive`boolean

`productId`string

`sellIfOutOfStock`boolean

`images`IkasProductImage[] | null

Refer to the IkasProductImage reference.

`campaigns`IkasProductCampaign[]

Refer to the IkasProductCampaign reference.

`unit`IkasProductVariantUnit | null

Refer to the IkasProductVariantUnit reference.

`mainImage`IkasProductImage | undefined

Refer to the IkasProductImage reference.

`hasStock`boolean

`isBackInStockEnabled`boolean

`isBackInStockCustomerLoginRequired`boolean | null | undefined

`isBackInStockReminderSaved`boolean

`groupedAttributeValues`IkasProductAttributeMap[]

Refer to the IkasProductAttributeMap reference.

`saveBackInStockReminder`function

```typescript
function saveBackInStockReminder(email: string): Promise<boolean>
```
Copy

email
:
string
