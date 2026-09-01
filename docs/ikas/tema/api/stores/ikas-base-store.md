<!-- kaynak: https://ikas.dev/docs/theme/api/stores/ikas-base-store -->

# IkasBaseStore

`customerStore`IkasCustomerStore

Refer to the IkasCustomerStore reference.

`cartStore`IkasCartStore

Refer to the IkasCartStore reference.

`currentPageType`IkasThemeJsonPageType | null | undefined

If you need to know which page the merchant is currently on, you can use this field.
Refer to the IkasThemeJsonPageType reference.

`localeOptions`IkasLocaleOption[]

Available locale options for the storefront.
Refer to the IkasLocaleOption reference.

`showLocaleOptions`boolean

Indicates whether the `localeOptions` should be shown to the customer.
This usually means that the customer is visiting from a country
for which there is a specific locale/pricing available.
(The `isRecommended=true` localeOption).

`currentCountryCode`string | null | undefined

ISO2 code of the visiting country of the customer.

`getInstance`function
Function to access the singleton IkasBaseStore instance.

```typescript
function getInstance(): getInstance
```
Copy
