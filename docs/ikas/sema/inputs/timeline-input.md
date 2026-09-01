<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/timeline-input -->

# TimelineInput

```graphql
type TimelineInput {
  message: String!
  sourceId: String!
  sourceType: SourceTypeEnum!
}
```
Copy

#### Fields
`message`String!required

The message you want to add

`sourceId`String!required

Indicates which source the message added to the timeline belongs to. For example, if a message is added to the timeline for an order, sourceId is the id of the order. The same is true for the customer.

`sourceType`SourceTypeEnum!required

The message source type you want to add.
