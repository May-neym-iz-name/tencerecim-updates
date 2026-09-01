<!-- kaynak: https://ikas.dev/docs/api/admin-api/timeline -->

# Timeline

There is a timeline API made for an order or customer. By using this api, many operations can be done on the order and customer side.
For example, you can view the shipping status information of an order on the timeline. You can edit these messages yourself or add different messages.
Likewise, a user can add messages to their customers' timeline as they wish, on the screen they view.

## Overview
By using this api, you can add message to timeline. You can write this message format using the string or in md format.
While writing the message, you can link other users and add the product or customer as a reference.

## Input

### Timeline
You can see the required fields for the message you want to add to the timeline in the input.

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

## Mutations

### Add Custom Timeline Entry

```graphql
addCustomTimelineEntry(
  input: TimelineInput!
): Boolean!
```
Copy

#### Arguments
`input`TimelineInput!required

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.

## Examples

### Add a custom timeline entry

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { addCustomTimelineEntry( input: { message: \"deneme\" sourceId: \"44265c6d-6d58-4e29-9544-1f6305df9bf9\" sourceType: CUSTOMER } ) }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
    addCustomTimelineEntry(
      input: {
        message: "deneme"
        sourceId: "44265c6d-6d58-4e29-9544-1f6305df9bf9"
        sourceType: CUSTOMER
      }
    )
  }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "addCustomTimelineEntry": true
  }
}
```
Copy
