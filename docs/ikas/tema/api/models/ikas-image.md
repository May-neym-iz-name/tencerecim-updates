<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-image -->

# IkasImage

`id`string

`src`string

URL for the image with 1080px size.

`thumbnailSrc`string

URL for the image with 180px size.

`getSrc`function
Get image url for the closest size to the provided size value.

```typescript
function getSrc(size: number): string
```
Copy

size
:
number
A number value for the desired image size.
