<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-product-option -->

# IkasProductOption

`id`string

`productOptionSetId`string

`name`string

`order`number

`type`IkasProductOptionType

Refer to the IkasProductOptionType reference.

`selectSettings`IkasProductOptionSelectSettings | null

Refer to the IkasProductOptionSelectSettings reference.

`textSettings`IkasProductOptionTextSettings | null

Refer to the IkasProductOptionTextSettings reference.

`fileSettings`IkasProductOptionFileSettings | null

Refer to the IkasProductOptionFileSettings reference.

`dateSettings`IkasProductOptionDateSettings | null

Refer to the IkasProductOptionDateSettings reference.

`price`number | null

`otherPrices`IkasProductOptionOtherPrice[] | null

Refer to the IkasProductOptionOtherPrice reference.

`isOptional`boolean

`optionalText`string | null

`requiredOptionId`string | null

`requiredOptionValueIds`string[] | null

`displayedChildOptions`IkasProductOption[]

Refer to the IkasProductOption reference.

`productOptionFileUpload`function

```typescript
function productOptionFileUpload(files: File[]): Promise<string[]>
```
Copy

files
:
File[]

`hasValidValues`boolean

`values`string[]

`values`setter

```typescript
function values(values: string[]): string[]
```
Copy

values
:
string[]

`childOptions`IkasProductOption[]

Refer to the IkasProductOption reference.

`childOptions`setter

```typescript
function childOptions(options: IkasProductOption[]): IkasProductOption[]
```
Copy

options
:
IkasProductOption[]

`initValues`function

```typescript
function initValues(): void
```
Copy
