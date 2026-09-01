<!-- kaynak: https://ikas.dev/docs/theme/example-theme/product-list -->

# Product List

Product list is where we list products, with their filter and sort options.
Generally speaking, themes should be listing products in Category, Brand and Search
pages. However, merchants can add this component to any page they want, like the home page for example.
Here is how this component looks like in the category page;
Since most of the logic for product listing is the same for all of these pages,
we create a ProductList
sub-component to reuse between the components. This component is not the one we define in the theme editor,
rather we define parent components
PageCategory,
PageBrand and
PageSearch
in the editor and use the ProductList sub-component in them.

## Props
We ask for a Category Prop Type and a Product List Prop Type
for the PageCategory component.
src/components/__generated__/types.ts

```tsx
export type PageCategoryProps = {
  category: IkasCategory;
  productList: IkasProductList;
};
```
Copy

When we add the PageCategory component to the category page, we need the product list to be filtered
by the category of that page. We select the Use page data as filter checkbox and use the All product list type
to accomplish that, as mentioned in the Product List Prop Type page.
The props are different for the other 2 components, but the underlying listing logic is the same. Therefore, we will explain
the ProductList component
in this page. To keep this doc readable we only explain the most important parts to look out for when listing / filtering
products.

## Filters

- Filters are being created by the ikas merchants from the dashboard.
You can check the Product Filters page to learn more about how to create filters.
- To display the filters on the left side,
we use the productList.filters array. This is an array of IkasProductFilter.
- We map on the productList.filters array and switch between different sub-components depending on the filter.displayType.
- We use the filter.settings (IkasProductFilterSettings) field to change default collapsed/expanded status of the filter.
These settings are being created by the ikas merchant while creating the filters.
Check FiltersWrapper
sub-component.
- We use the productList.clearFilters function to clear filters.

### Box and List Filters
We map on the filter.displayedValues to render each available value for the filters. When the merchant clicks on the filter value,
we use the filter.onFilterValueClick function and pass the clicked value into the function.
We use the value.resultCount to check if the value should be disabled. This field indicates how many product would the list have, if the merchants were to click on that value.
If the resultCount is 0, we indicate that with a minor CSS change. We also use the value.isSelected field to indicate the value as selected.
Check the BoxFilters
and the ListFilters sub-components.

### Number Range Filter
filter.numberRangeLimit field indicates the boundaries of the number range; from is the lower limit and to is the upper limit.
We use the filter.onNumberRangeChange function to change the value, again by providing a from and to value to the function.
Example; the merchant can filter products priced between 100$ - 200$. Check the NumberRangeFilters
and its hook useNumberRange.

### Number Range List Filter
We map over the filter.numberRangeListOptions array to render each possible option.
Each option in this array has an isSelected field; also the to and from fields to indicate the range for the option.
We use the filter.onNumberRangeClick function when the merchant clicks on the option, and pass the clicked option into this function.
Example; the merchant can create a number range list filter for different price ranges, like 100$-200$, 200$-300$ etc..
Each option indicates one range item. Check the NumberRangeListFilter.

### Swatch Filter
We map on the filter.displayedValues to render each available value for the filters, like the box and list filters.
However this time we use the colorCode and thumbnailImage fields to render the value.
Merchants can select either a color code or upload an image indicating the material/color of the products.
Our component covers both of these cases. We use the onFilterValueClick again, when a value is clicked by the merchant,
and isSelected filter to indicate which value is selected.
Check the SwatchFilters.

### Category Filter
Category filters are different from the filters created from the dashboard.
This filter type generally sits on top of every other filter, acting as a navigation between different categories.
We use the productList.filterCategories to render these filters, instead of the productList.filters.
Similarly to the normal filters, we map over this array and each item has isSelected and resultCount
fieds in them. We use the productList.onFilterCategoryClick function when the merchant clicks on a category.
Check the
Categories component.

## Products
We render the products on the right side of the filters.
We map over the productList.data to render each product.
We use the product.selectedVariant to render most fields.
We used the product.href to link to the product detail page,
but you can use product.productHref as well.
The difference is that product.href navigates to the selectedVariant's
url, while the product.productHref navigates to the first
variant with available stock.
Check the product component.
We render sort options corresponding to the IkasProductListSortType enum.
We use the productList.setSortType to change the sort type.
Check the sort component.
We use the productList.hasPrev and productList.hasNext pagination fields to check whether
the merchant can paginate to a previous/next page.
We use the getPage function to fetch a new page of products. You can also use the
getNext and getPrev functions of the IkasProductList.
Check the pagination component.
note
If you want to create a product list with infinite scroll, use the getPrev and getNext functions.
Also, use the setVisibleInfiniteScrollPage function to set which page is currently visible on the product list.
If the merchant navigates to a product's page, and comes back to the product list, this
functions helps to set the last scroll position of the product list.
