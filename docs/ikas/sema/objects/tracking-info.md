<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/tracking-info -->

# TrackingInfo

```graphql
type TrackingInfo {
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

Indicates whether the notification is sent to the customer after the cargo is delivered. isSendNotification returns true if the notification is sent.

`trackingLink`String

It is the tracking link of the order package.

`trackingNumber`String

It is the tracking number of the order package.
