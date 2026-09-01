<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/add-order-invoice-input -->

# AddOrderInvoiceInput

```graphql
type AddOrderInvoiceInput {
  appId: String!
  base64: String
  invoiceData: JSON
  invoiceNumber: String!
  orderId: String!
  sendNotificationToCustomer: Boolean!
  type: InvoiceTypeEnum!
}
```
Copy

#### Fields
`appId`String!required

It is the app id for which the invoice is issued.

`base64`String

It is the content of invoice. Is the entered value must be in base64 format.

`invoiceData`JSON

'It is data for create invoice.

`invoiceNumber`String!required

It is the number of the order invoice.

`orderId`String!required

It is the order id for which the invoice is issued.

- Is the entered id must be exist in ikas.

`sendNotificationToCustomer`Boolean!required

If the customer is to be informed after the invoice information is saved, this field can be sent as "true".

`type`InvoiceTypeEnum!required

It is the type enum of the invoice.
