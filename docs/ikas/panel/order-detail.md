<!-- kaynak: https://ikas.dev/docs/dashboard/order-detail -->

# Order Detail

You can manage the entire order process with core order detail features such as Payments, App Management, Order Line Items, Shipping Operations, etc. on this page.
Components of an order may include some of these features and they are seperated by different sections namely
Order Package, Customer, Order Summary, Transactions, Conversion Rates, Tags, and Timeline.
You can find detailed information about required sections for your development process below.
`(Dashboard Navigation Menu > Orders > Click to an Order From the List)`

## Order Package
Thanks to Order Packages, you can group your Order Line Items and manage these grouped item statuses separately.
info
To edit or create a different Order Package, you need to change at least 1 order line item's status by the action buttons at the bottom of the section.
When you click an action button, a modal will open to display you a selection of order line items you want to be affected by the status change.
After the selection, all selected items with the same status are grouped as a new Order Package.

info
If you want to try different order statuses on the account/orders page of your theme, you need to change Order Package statuses first. There are 12 possible status to cover all order status management.

### Unfulfilled
When an order is created from your storefront, its status is set to Unfulfilled by default. There are 3 available actions you can take on a Unfulfilled Packages:

- Mark as Fullfill
- Mark as Ready for Delivery (only if order shipping method are CLICK_AND_COLLECT)
- Ready For Shipment

### Ready For Shipment
It indicates that order line items in the package are prepared for shipping. There are 2 available actions you can take on a Ready For Shipment Packages:

- Mark as Fullfill
- Cancel

### Fulfilled
It indicates that order line items in the package are sent to the customer. There are 3 available actions you can take on a Fulfilled Packages:

- Edit Tracking Info
- Set as Delivered
- Cancel

### Canceled
It indicates that order line items in the package are canceled.

### Cancel Requested
It indicates that there is a cancel request has been made for the order package.

### Cancel Rejected
It indicates that cancel request for the order package is rejected.

### Refund Requested
It indicates that a refund request has been made for the order line items in the package. There are 2 available actions you can take on a Refund Requested Packages:

- Approve Refund Request
- Reject Refund Request

### Refund Request Accepted
It indicates that the refund request accepted for the order line items in the package. There are 3 available actions you can take on a Refund Request Accepted Packages:

- Add Tracking Info
- Edit Tracking Info
- Cancel

### Refund Rejected
It indicates that the refund rejected for the order line items in the package. There are 3 available actions you can take on a Refund Rejected Packages:

- Add Tracking Info
- Edit Tracking Info
- Cancel

### Refunded
It indicates that the order line items in the package has been succesfully refunded.

### Ready For Pick Up
It indicates that the order line items in the package are ready to pick up from the store. There are 1 available actions you can take on a Ready For Pick Up Packages:

- Mark as Delivered

### Error
It indicates that an error has been occured while creating the order package.

## Transactions
You can see the payment status of an order.
info
If you created an Order with Money Order to test an order process, you can change its payment status by approving its transaction.
