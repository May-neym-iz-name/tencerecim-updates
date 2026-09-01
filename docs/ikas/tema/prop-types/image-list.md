<!-- kaynak: https://ikas.dev/docs/theme/prop-types/image-list -->

# Image List

Image List prop type displays the merchant an image select component in the editor
and allows the merchant to upload several images.
The only difference from the Image Prop Type is that you get an
array of IkasImage, rather than a single one.
You can render the images you get as described in the Image Prop Type.

```tsx
export type ImageListExampleProps = {
    ...
    imageList: IkasImage[];
};
```
Copy
