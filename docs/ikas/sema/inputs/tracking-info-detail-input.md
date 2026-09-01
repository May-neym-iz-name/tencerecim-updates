<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/tracking-info-detail-input -->

# TrackingInfoDetailInput

```graphql
type TrackingInfoDetailInput {
  barcode: String
  cargoCompany: String
  cargoCompanyId: String
  isSendNotification: Boolean
  trackingLink: String
  trackingNumber: String
}
```
Copy

#### Fields
`barcode`String

It is the barcode of the order package.

`cargoCompany`String

It is the name of the cargo company.

`cargoCompanyId`String

It is the key of the cargo company which can be retrieved via listCargoCompany query.

`isSendNotification`Boolean

If the customer is to be informed after the cargo is delivered, this field can be sent as `true`.

`trackingLink`String

It is the tracking link of the order package.

`trackingNumber`String

It is the tracking number of the order package.
