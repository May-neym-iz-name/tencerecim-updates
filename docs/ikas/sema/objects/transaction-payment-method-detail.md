<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/transaction-payment-method-detail -->

# TransactionPaymentMethodDetail

```graphql
type TransactionPaymentMethodDetail {
  bankName: String
  binNumber: String!
  cardAssociation: TransactionCardAssociationEnum
  cardFamily: String
  cardType: TransactionCardTypeEnum
  installment: TransactionInstallmentPrice
  lastFourDigits: String!
  paymentMethodName: String
  threeDSecure: Boolean!
}
```
Copy

#### Fields
`bankName`String

`binNumber`String!required

`cardAssociation`TransactionCardAssociationEnum

`cardFamily`String

`cardType`TransactionCardTypeEnum

`installment`TransactionInstallmentPrice

`lastFourDigits`String!required

`paymentMethodName`String

`threeDSecure`Boolean!required
