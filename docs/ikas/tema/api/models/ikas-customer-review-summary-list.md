<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-customer-review-summary-list -->

# IkasCustomerReviewSummaryList

`data`IkasCustomerReviewSummary[]

Refer to the IkasCustomerReviewSummary reference.

`limit`number

Page size limit for pagination.

`page`number

Currently displayed page number.

`count`number

Total data count.

`pageCount`number

Total page count.

`isInitialized`boolean

`true` if the list is initalized and first page of data is fetched, `false` otherwise.

`hasPrev`boolean

`true` if there is a previous page available for pagination, `false` otherwise.

`hasNext`boolean

`true` if there is a next page available for pagination, `false` otherwise.

`isLoading`boolean

`getInitial`function

```typescript
function getInitial(): Promise<void>
```
Copy

`getPrev`function
Function to get the previous page data with pagination. Generally being used for infinite scrolls. This function updates the data array.

```typescript
function getPrev(): Promise<void>
```
Copy

`getNext`function
Function to get the next page data with pagination. Generally being used for infinite scrolls. This function updates the data array.

```typescript
function getNext(): Promise<void>
```
Copy

`getPage`function
Function to get page data for the specified page. Generally being used with page based paginations, rather than infinite scrolls. This function updates the data array.

```typescript
function getPage(page: number): Promise<void>
```
Copy

page
:
number

`toJSON`function

```typescript
function toJSON(): { data: IkasCustomerReviewSummary[]; limit: number; page: number; count: number; initialized: boolean; minPage: number | null | undefined; productId: string;}
```
Copy
