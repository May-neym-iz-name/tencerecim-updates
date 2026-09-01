<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/merchant-address -->

# MerchantAddress

```graphql
type MerchantAddress {
  addressLine1: String
  addressLine2: String
  city: MerchantAddressCity
  company: String
  country: MerchantAddressCountry
  district: MerchantAddressDistrict
  firstName: String
  identityNumber: String
  lastName: String
  postalCode: String
  state: MerchantAddressState
  taxNumber: String
  taxOffice: String
  title: String
  type: MerchantSettingsAddressTypeEnum
  vkn: String
}
```
Copy

#### Fields
`addressLine1`String

The merchant's mailing address.

`addressLine2`String

An additional field for the merchant's mailing address.

`city`MerchantAddressCity

The merchant's city.

`company`String

`country`MerchantAddressCountry

The merchant's country.

`district`MerchantAddressDistrict

The merchant's district in city.

`firstName`String

The merchant staff's first name.

`identityNumber`String

The merchant's identity numbers.

`lastName`String

The merchant staff's last name.

`postalCode`String

The merchant's postal code, also known as zip, postcode, etc.

`state`MerchantAddressState

`taxNumber`String

`taxOffice`String

If merchant is corporate, merchant can use that field to fill their Tax Office name.

`title`String

`type`MerchantSettingsAddressTypeEnum

`vkn`String
