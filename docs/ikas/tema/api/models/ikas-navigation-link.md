<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-navigation-link -->

# IkasNavigationLink

`href`string

`label`string

`subLinks`IkasNavigationLink[]

Sub-links for the current link. Use this prop to create nested navigation menus.

`isExternal`boolean

`itemId`boolean

Id of the specific data model that this link is pointing to.
For example, if the link points to a specific product page, itemId will be
equal to the product's id.
