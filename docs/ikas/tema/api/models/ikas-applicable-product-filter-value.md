<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-applicable-product-filter-value -->

# IkasApplicableProductFilterValue

`id`string

`key`string

A unique string to identify the filter value.

`name`string

Merchant friendly name of the filter value.

`colorCode`string | null

CSS color code value of the filter value. This field will only be available for filters with
`displayType` IkasProductFilterDisplayType.SWATCH.

`thumbnailImageId`string | null

Image id of the filter value. This field will only be available for filters with
`displayType` IkasProductFilterDisplayType.SWATCH.

`thumbnailImage`IkasImage | null

Image of the filter value. This field will only be available for filters with
`displayType` IkasProductFilterDisplayType.SWATCH.
Refer to the IkasImage reference.

`resultCount`number | null

Number of total products available if this filter value were to applied.
You can write this number value next to the name, like Small (400), Red (30) etc.
so that the merchants can see how many products available before selcting a filter.

`isSelected`boolean

Indicates whether this filter value is currently selected/applied or not.
