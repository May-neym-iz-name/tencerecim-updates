<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-product-list -->

# IkasProductList

`data`IkasProduct[]

Refer to the IkasProduct reference.

`filters`IkasProductFilter[] | null

Refer to the IkasProductFilter reference.

`sort`IkasProductListSortType

Refer to the IkasProductListSortType reference.

`limit`number

`pageType`IkasThemeJsonPageType

Refer to the IkasThemeJsonPageType reference.

`page`number

`minPage`number

`count`number

`pageCount`number

`searchKeyword`string

`searchKeyword`setter

```typescript
function searchKeyword(value: string): string
```
Copy

value
:
string

`isInitialized`boolean

`isFilterable`boolean

`isFiltered`boolean | undefined

`isStatic`boolean

`isDiscounted`boolean

`isRecommended`boolean

`isLastViewed`boolean

`isRelatedProducts`boolean

`isSearch`boolean

`hasPrev`boolean

`hasNext`boolean

`isLoading`boolean

`filterQueryParams`string

`filterCategories`IkasFilterCategory[] | undefined

Refer to the IkasFilterCategory reference.

`hasAppliedfilter`boolean | undefined

`isFeaturedSortEnabled`boolean

`clearFilters`function

```typescript
function clearFilters(): void
```
Copy

`getPrev`function

```typescript
function getPrev(): Promise<void>
```
Copy

`getNext`function

```typescript
function getNext(): Promise<void>
```
Copy

`getPage`function

```typescript
function getPage(page: number): Promise<void>
```
Copy

page
:
number

`setSortType`function

```typescript
function setSortType(sortType: IkasProductListSortType): Promise<void>
```
Copy

sortType
:
IkasProductListSortType

`onFilterCategoryClick`function

```typescript
function onFilterCategoryClick(filterCategory: IkasFilterCategory, disableRoute = false): Promise<void>
```
Copy

filterCategory
:
IkasFilterCategory

disableRoute
:
boolean

`toJSON`function

```typescript
function toJSON(): { data: IkasProduct[]; type: IkasProductListType; pageType: IkasThemeJsonPageType; sort: IkasProductListSortType; limit: number; page: number; count: number; searchKeyword: string; initialized: boolean; minPage: number | null | undefined; filterBrandId: string | null | undefined; filterCategoryId: string | null | undefined; filterCategories: IkasFilterCategory[] | null | undefined; filters: IkasProductFilter[] | null | undefined; recommendFor: string | null | undefined; productListPropValue: IkasProductListPropValue; pageSpecificData: IkasBrand | IkasCategory | null | undefined;}
```
Copy

`setVisibleInfiniteScrollPage`function

```typescript
function setVisibleInfiniteScrollPage(page: number): void
```
Copy

page
:
number
