<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/category-condition-input -->

# CategoryConditionInput

```graphql
type CategoryConditionInput {
  conditionType: CategoryConditionTypeEnum!
  method: CategoryConditionMethodEnum
  valueList: [String!]!
}
```
Copy

#### Fields
`conditionType`CategoryConditionTypeEnum!required

`method`CategoryConditionMethodEnum

`valueList`[String!]!required
