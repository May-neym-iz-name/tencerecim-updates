<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/customer-attribute-translation -->

# CustomerAttributeTranslation

```graphql
type CustomerAttributeTranslation {
  description: String
  locale: String!
  name: String
  options: [CustomerAttributeOptionTranslation!]
}
```
Copy

#### Fields
`description`String

`locale`String!required

`name`String

`options`[CustomerAttributeOptionTranslation!]
