<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-checkout-settings -->

# IkasCheckoutSettings extends IkasBaseModel

`giftPackagePriceList`IkasCheckoutSettingsPrice[] | null

Refer to the IkasCheckoutSettingsPrice reference.

`identityNumberRequirement`IkasCheckoutRequirement

Checkout addresses requires identity number if this field is true.
Refer to the IkasCheckoutRequirement reference.

`isAccountRequired`boolean

`true` if guest checkout is disabled and only customers with accounts can complete checkouts.

`isGiftPackageEnabled`boolean | null

`isShowPostalCode`boolean | null

`isTermsAndConditionsDefaultChecked`boolean | null

`options`IkasCheckoutOption[] | null

Refer to the IkasCheckoutOption reference.

`phoneRequirement`IkasCheckoutRequirement

Refer to the IkasCheckoutRequirement reference.

`postalCodeRequirement`IkasCheckoutRequirement | null

Refer to the IkasCheckoutRequirement reference.

`showCheckoutNote`boolean | null

`showTermsAndConditionsCheckbox`boolean

`storefrontId`string
