<!-- kaynak: https://ikas.dev/docs/dashboard/product-option -->

# Product Option Set

Product options are the way ikas merchants allow their customers customize the product they are purchasing.
The most simple way to explain product options is a T-Shirt.
If the merchant is selling T-Shirts, and wants the customers to upload images
to be printed on the T-Shirts, they can do so by using the product options.
You can think of product options as a set of simple data types, that will be filled by the customer on the
storefront to create a more specific product.
The difference from the Variant Types is that, variant types
are a set of predefined values for the product; while the options are more dynamic,
their values can be anything the customers provides.
`(Dashboard Navigation Menu > Products > Definitions > Product Option Sets)`

## Adding Options
Lets look at creating options. Options have a name,
a type and some specific validation settings depending on the type.
Options can also have prices, meaning that if the user selects or provides value
for the option, they will pay an extra price for it.
Options can also be nested. An option can be dependent on another option to be selected first.
Options can also be required / optional.
Here are the types of options the merchants can add.

- Checkbox
- Choice
- Color Picker
- Date Picker
- File
- Text
- Paragraph
