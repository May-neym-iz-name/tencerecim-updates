<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-product -->

# IkasProduct

`id`string

`name`string

`type`IkasProductType

Type of the product. Refer to the IkasProductType reference.

`description`string

`shortDescription`string

`metaData`IkasHTMLMetaData | null

Meta data info of the product. Refer to the IkasHTMLMetaData reference for more info.

`brand`IkasBrand | null

Brand of the product. Refer to the IkasBrand reference for more info.

`categories`IkasCategory[]

Categories of the product. Refer to the IkasCategory reference for more info.

`tags`IkasTag[]

Tags of the product. Refer to the IkasProductTag reference for more info.

`variants`IkasProductVariant[]

Variants of the product. Refer to the IkasProductVariant reference for more info.

`variantTypes`IkasProductVariantType[]

Variant types of the product. Refer to the IkasProductVariantType reference for more info.

`attributes`IkasProductAttributeValue[]

Attributes of the product. Refer to the IkasProductAttributeValue reference for more info.

`productOptionSetId`string | null

`baseUnit`IkasProductBaseUnit | null

Refer to the IkasProductBaseUnit reference for more info.

`productOptionSet`IkasProductOptionSet | null

Refer to the IkasProductOptionSet reference for more info.

`campaigns`IkasProductCampaign[] | null

Refer to the IkasProductCampaign reference for more info.

`selectedVariantValues`IkasVariantValue[]

Refer to the IkasVariantValue reference for more info.

`hasVariant`boolean

`hasStock`boolean

`hasValidProductOptionValues`boolean

`href`string

`productHref`string

`mainVariantType`IkasVariantType | undefined

Refer to the IkasVariantType reference for more info.

`mainVariantValue`IkasVariantValue | undefined

Refer to the IkasVariantValue reference for more info.

`selectedVariant`IkasProductVariant

Refer to the IkasProductVariant reference for more info.

`displayedVariantTypes`IkasDisplayedVariantType[]

Refer to the IkasDisplayedVariantType reference for more info.

`isCustomerReviewEnabled`boolean

`isCustomerReviewLoginRequired`boolean

`isAddToCartEnabled`boolean

`groupedAttributeValues`IkasProductAttributeMap[]

Refer to the IkasProductAttributeMap reference for more info.

`selectedVariantUnitPriceText`string | undefined

`selectVariantValue`function

```typescript
function selectVariantValue(variantValue: IkasVariantValue): void
```
Copy

variantValue
:
IkasVariantValue

`getVariantUnitPriceText`function
Returns a unit price string that can be directly displayed on your theme.

```typescript
function getVariantUnitPriceText(variant: IkasProductVariant): void
```
Copy

variant
:
IkasProductVariant

`getCampaigns`function
Returns campaigns for the product.

```typescript
async function getCampaigns(): Promise<IkasProductCampaign[] | undefined>
```
Copy

`getCustomerReviews`function
Returns customer reviews for the product.

```typescript
async function getCustomerReviews(params?: { limit?: number; page?: number }): Promise<IkasCustomerReviewList>
```
Copy

params
:
{ limit?: number; page?: number }

`getProductOptionSet`function
Get product option set for the product. Products of an IkasProductList initally have their productOptionSet value set to null. Specific IkasProduct instances of product pages on the other hand, already have their productOptionSet value set. You should only use this function for product list items and other non-specific product instances.

```typescript
async function getProductOptionSet(): Promise<boolean>
```
Copy
