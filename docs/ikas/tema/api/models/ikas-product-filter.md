<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-product-filter -->

# IkasProductFilter

`id`string

`key`string

`name`string

`order`string

`type`IkasProductFilterType

Refer to the IkasProductFilterType reference.

`displayType`IkasProductFilterDisplayType

Refer to the IkasProductFilterDisplayType reference.

`isMultiSelect`boolean

`isFacetFilter`boolean | null

`values`IkasApplicableProductFilterValue[] | null

Refer to the IkasApplicableProductFilterValue reference.

`customValues`string[] | null

`settings`IkasProductFilterSettings | null

Refer to the IkasProductFilterSettings reference.

`numberRange`IkasFilterRangeValue | null | undefined

Refer to the IkasFilterRangeValue reference.

`isCustomValueFilter`boolean

`isStockFilter`boolean

`valueList`string[]

`keyList`string[]

`displayedValues`IkasApplicableProductFilterValue[]

Refer to the IkasApplicableProductFilterValue reference.

`onFilterValueClick`function

```typescript
function onFilterValueClick(filterValue: IkasApplicableProductFilterValue): void
```
Copy

filterValue
:
IkasApplicableProductFilterValue

`onNumberRangeClick`function

```typescript
function onNumberRangeClick(option: IkasProductFilterNumberRangeListOption): void
```
Copy

option
:
IkasProductFilterNumberRangeListOption

`onNumberRangeChange`function

```typescript
function onNumberRangeChange(numberRange: IkasFilterRangeValue | null): void
```
Copy

numberRange
:
IkasFilterRangeValue | null

`clear`function

```typescript
function clear(): void
```
Copy

`toInput`function

```typescript
function toInput(): IkasProductFilterFunctions.IkasSearchInputFilterListInput
```
Copy

`toJSON`function

```typescript
function toJSON(): Object
```
Copy

`applyQueryParam`function

```typescript
function applyQueryParam(value: string): void
```
Copy

value
:
string
