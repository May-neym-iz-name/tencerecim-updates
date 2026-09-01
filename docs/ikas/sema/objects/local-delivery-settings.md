<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/local-delivery-settings -->

# LocalDeliverySettings

```graphql
type LocalDeliverySettings {
  activeDays: [LocalDeliverySettingsDayType!]!
  activeLocalDeliveryHours: LocalDeliveryAvailableHoursRange
  timezone: String!
}
```
Copy

#### Fields
`activeDays`[LocalDeliverySettingsDayType!]!required

`activeLocalDeliveryHours`LocalDeliveryAvailableHoursRange

`timezone`String!required
