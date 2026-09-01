<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-raffle-list -->

# IkasRaffleList

`data`IkasRaffle[]

Refer to the IkasRaffle reference.

`limit`number

`page`number

`count`number

`pageCount`number

`isInitialized`boolean

`hasPrev`boolean

`hasNext`boolean

`isLoading`boolean

`minPage`number

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

`toJSON`function

```typescript
function toJSON(): { data: IkasRaffle[]; limit: number; page: number; count: number; initialized: boolean; minPage: number | null | undefined;}
```
Copy
