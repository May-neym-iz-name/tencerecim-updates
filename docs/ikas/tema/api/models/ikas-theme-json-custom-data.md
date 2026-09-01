<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-theme-json-custom-data -->

# IkasThemeJsonCustomData

`id`string

`name`string | null

`description`string | null

`typescriptName`string | null

`type`IkasThemeJsonComponentPropType

Refer to the IkasThemeJsonComponentPropType reference.

`isRequired`boolean

`translations`{[locale: string]: IkasThemeJsonCustomDataTranslation;}

Refer to the IkasThemeJsonCustomDataTranslation reference.

`key`string | null

`nestedData`IkasThemeJsonCustomData[] | null

Refer to the IkasThemeJsonCustomData reference.

`itemCount`number | null

`attributeTypes`IkasProductAttributeType[] | null

Refer to the IkasProductAttributeType reference.

`enumOptions`IkasThemeJsonEnumOption[] | null

Refer to the IkasThemeJsonEnumOption reference.

`customDataId`string | null

`sliderData`IkasThemeJsonSliderData

Refer to the IkasThemeJsonSliderData reference.

`isRoot`boolean

`parent`IkasThemeJsonCustomData | null

Refer to the IkasThemeJsonCustomData reference.

`flat`IkasThemeJsonCustomData[]

Refer to the IkasThemeJsonCustomData reference.

`toJSON`function

```typescript
function toJSON(): Object
```
Copy
