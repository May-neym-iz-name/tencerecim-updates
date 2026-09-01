<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/invoice -->

# Invoice

```graphql
type Invoice {
  id: String!
  appId: String!
  appName: String!
  hasPdf: Boolean
  invoiceData: JSON
  invoiceNumber: String!
  storeAppId: String!
  type: InvoiceTypeEnum!
}
```
Copy

#### Fields
`id`String!required

It is the id of the order invoice.

`appId`String!required

It is the id of the order invoice.

`appName`String!required

It is the id of the order invoice.

`hasPdf`Boolean

It is indicates that the invoice has the pdf.

`invoiceData`JSON

It is data of the invoice.

`invoiceNumber`String!required

It is the id of the order invoice.

`storeAppId`String!required

It is the id of the order invoice.

`type`InvoiceTypeEnum!required

It is the type enum of the invoice.
