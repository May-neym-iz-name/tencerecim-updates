<!-- kaynak: https://ikas.dev/docs/dashboard/product -->

# Product

There are 2 types of products, Basic Product and Product with Variant(s).
`(Dashboard Navigation Menu > Products)`

## Basic Product
When users navigate to Create Product Page, they will see basic product fields by default.
Let's assume that you want to sell a pencil in only one color (eg: Red). Since there aren't any other color options of the pencil,
you should save this Product as a basic product.
However, if you have variants of the same product, you can add these to your product from the Variants section.
info
Even if you create a basic product, the variants field of the Product Model
will still have 1 variant in it. The product model contains common properties for the product and all variants,
while the variants themselves have more specific fields tied to them. Therefore when you create a basic product,
we will create 1 variant, but its variant types and values will be empty. The other fields such as prices
will still be used from the Variant Model.
To sum up, Product Model is the parent product model, and
Variant Model is the more specific version of it.
To make overall usage same between the basic and variant products, we create 1 default variant.
Then we use Variant Model model
in both basic and products with variants.

## Product with Variant(s)
Product with variants enables you to show all variants of your product on the same page with a single selection.
Let's assume that you have a pencil with 10 different colors in this case.
Instead of creating 10 different products for each color,
you can create just one by adding the colors as variants within the product.
info
If you want to learn more about variant types, please check the Variant Type section.

note
Maximum 3 variant types can be added to a product.

info
When a new variant type is added to the product, it is automatically converted to the product with variant(s) type.
To make this conversion happen, we are creating the variants of the product by combining all of the defined variant values with each other.
Let's say you have defined 2 variant types for the product as Color and Size:

- The color type has 2 variant values in Yellow and Red color.
- The size type has 3 variant values in Small, Medium and Large.
After combining all of the variant values, you would have 6 variants of the product:
