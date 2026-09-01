<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/stock-location-address -->

# StockLocationAddress

```graphql
type StockLocationAddress {
  address: String
  city: StockLocationAddressCity
  country: StockLocationAddressCountry
  district: StockLocationAddressDistrict
  phone: String
  postalCode: String
  state: StockLocationAddressState
}
```
Copy

#### Fields
`address`String

It is the full address of the stock location.

`city`StockLocationAddressCity

It is the city information of the address.

`country`StockLocationAddressCountry

It is the country information of the address.

`district`StockLocationAddressDistrict

It is the district information of the address.

`phone`String

It is the phone number of the address.

`postalCode`String

It is the postal code of the address.

`state`StockLocationAddressState

It is the state information of the address.
