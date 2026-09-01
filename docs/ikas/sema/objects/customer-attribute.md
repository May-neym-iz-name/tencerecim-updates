<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/customer-attribute -->

# CustomerAttribute

```graphql
type CustomerAttribute {
  id: ID!
  description: String
  name: String!
  options: [CustomerAttributeOption!]
  order: Float
  salesChannels: [CustomerAttributeSalesChannel!]
  translations: [CustomerAttributeTranslation!]
  type: CustomerAttributeTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`description`String

`name`String!required

`options`[CustomerAttributeOption!]

`order`Float

`salesChannels`[CustomerAttributeSalesChannel!]

`translations`[CustomerAttributeTranslation!]

`type`CustomerAttributeTypeEnum!required
