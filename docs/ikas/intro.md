<!-- kaynak: https://ikas.dev/docs/intro -->

# Introduction

note
This API is for the v1 endpoint.
We recommend that new API users use the v2 API, which is easier to use and has been improved based on feedback from v1 users.
You can access the new API at: https://builders.ikas.com/docs/app-development

API Address: https://api.myikas.com/api/v1/admin/graphql
Open GraphQL Playground

## API Scopes
ikas API provides scopes to grant permissions to apps that calls ikas API. Scopes and their descriptions are given below. You can specify these scopes while you create your Private App.

### Scope Definitions
`View Products`read_products

App can view all the details and variants of your products. This includes other details associated with the product, such as categories, brands and vendors.

`Manage Products`write_products

App can edit all the details and variants of your products. This includes other details associated with the product, such as categories, brands and vendors.

`View Orders`read_orders

App can view orders on all your sales channels. This includes products and customers associated with the order.

`Manage Orders`write_orders

App can edit orders from all your sales channels and make changes to order statuses.

`View Customers`read_customers

App can access the addresses and other details of customers in your store.

`Manage Customers`write_customers

App can edit customers' information in your store and add new addresses.

`View Campaigns`read_campaigns

App can display automatic discounts and coupon codes that you create in your store.

`Manage Campaigns`write_campaigns

App can create new discounts on your store or edit your existing campaigns.

`View Inventory Levels`read_inventories

App can view your stock locations and inventory levels of your products.

`Manage Inventory Levels`write_inventories

App can manage your stock locations and inventory levels of your products.
