<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-customer -->

# IkasCustomer extends IkasBaseModel

`accountStatusUpdatedAt`number | null

`customerGroupIds`string[] | null

`customerSequence`number | null

`email`string | null

`emailVerifiedDate`number | null

`firstName`string

`fullName`string | null

`isEmailVerified`boolean | null

`isPhoneVerified`boolean | null

`lastName`string | null

`note`string | null

`orderCount`number | null

`passwordUpdateDate`number | null

`phone`string | null

`phoneVerifiedDate`number | null

`subscriptionStatusUpdatedAt`number | null

`tagIds`string[] | null

`registrationSource`IkasCustomerRegistrationSource | null

Refer to the IkasCustomerRegistrationSource reference.

`accountStatus`IkasCustomerAccountStatus | null

Refer to the IkasCustomerAccountStatus reference.

`addresses`IkasCustomerAddress[] | null

Refer to the IkasCustomerAddress reference.

`subscriptionStatus`IkasCustomerEmailSubscriptionStatus | null

Refer to the IkasCustomerEmailSubscriptionStatus reference.

`attributes`IkasCustomerAttributeValue[] | null

Refer to the IkasCustomerAttributeValue reference.

`isSubscribed`boolean

`basicInfo`{ id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null;
}
