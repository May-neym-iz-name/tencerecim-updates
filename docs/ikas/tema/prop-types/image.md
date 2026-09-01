<!-- kaynak: https://ikas.dev/docs/theme/prop-types/image -->

# Image

Image prop type displays the merchant an image select component in the editor and asks the merchant to upload an image.
The prop value you get is an instance of IkasImage.
Let's create a simple component that displays an image.

We provide an Image component that we
extend from Next Image.
src/components/image-prop/index.tsx

```tsx
import { observer } from 'mobx-react-lite';
import { Image } from '@ikas/storefront';
import { ImagePropProps } from '../__generated__/types';

import styles from './style.module.css';

const ImagePropDemo: React.FC<ImagePropProps> = (props) => {
  const { image } = props;
  return (
    <div className={styles['img-container']}>
      <Image image={image} layout="fill" sizes="500px" objectFit="contain" />
    </div>
  );
};

export default observer(ImagePropDemo);
```
Copy

src/components/image-prop/style.module.css

```css
.img-container {
  position: relative;
  width: 500px;
  height: 500px;
  margin: 48px auto;
}
```
Copy

## Layout Types
We used layout type `fill` here to just display a square image inside a container.
However there are many more use cases and different layout scenarios for images.
These layout types and how they should be used are explained in next/image
documentation, with some demo images to explain how they look.
You should check them out, and try different use cases on your own. To give a summary on different layout types;

- `intrinsic`
Use this layout type if you want the image to scale down to it's parent container's width,
if the container width is smaller then the image width. If the container's width is higher then the image's width,
image will not scale up to match it's parent size, meaning that it will keep its original size.

- `fixed`
Use this layout type if you want a fixed sized image. `width` and `height` params you provide will determine the image's size.
Mostly used for small icons, or logos that don't need to change size responsively.

- `responsive`
Use this layout type if you want your image to scale down or up accordingly to it's parent container's width.
Mostly used in grid layouts where you display 3 or 4 images side to side, or a product detail component where you display
product images on the left and some information on the right side etc..
You can use width and height props here to provide an aspect ratio for the image.
For example; if you set the props like the code block here, the image will try to fill up a space with 16:9 aspect ratio.
Note that we also use `objectFit` prop here to make image cover the 16:9 space.
You should provide the sizes attribute here to improve loading performance for each device size.

```tsx
<Image image={image} layout="responsive" width={16} height={9} sizes="500px" objectFit="cover" />
```
Copy

- `fill`
Use this layout type if you want the image to fill its container's size.
This is mostly used for the cases when you can provide a fixed size for a container, and you want the image to stay in the boundaries of that container.
You should provide the sizes attribute here to improve loading performance for each device size.

If you have never used Next Image before, this might feel strange at first,
but if you keep playing with the available props and container sizes, you will easily render images responsively.

## Sizes Attribute
For the `responsive` and `fill` layout types, you have to provide proper size values for
the sizes attribute,
so that the browser can fetch the appropriate sized image for the current viewport and device pixel ratio.
If you don't provide this value, you will increase the image loading times significantly, and your theme is going to feel very slow.
`Sizes` attribute basically describes, how much width your image actually takes up on the screen on different screen sizes.
For example; if you have a responsive image,
and your image width is 120px below 768px screen width,
and 360px below 1440px screen width,
and 540px when above 1440px screen width,
you would type something like this for the sizes value;

```tsx
<Image
  image={image}
  layout="responsive"
  width={16}
  height={9}
  sizes="(max-width: 768px) 120px, (max-width: 1440px) 360px, 540px"
  objectFit="cover"
/>
```
Copy

With this `sizes` value, you are basically informing your browser;

```undefined
My image has;
  - 120px width below 768px viewport width,
  - 360px width between 768px and 1440px viewport width,
  - 540px width above 1440px viewport width.
```
Copy

Your browser checks these values you provide, and your device pixel ratio to fetch the most appropriately sized image for the current viewport.
Here is more information on the sizes property.
You might be thinking, my image does not have a fixed size, and keeps shrinking and growing constantly,
how am i supposed to provide constant values for these breakpoints?
In this case, use your best judgement to provide as many breakpoint as you see fit, to inform the browser that image size is growing/shrinking substantially.
If the image grows 50px in width, you might not need a new breakpoint to indicate that.
However if the image grows 200px-300px, it might be better to inform the browser about it.
Lastly, if your image size changes relatively to the viewport width, you can use `vw` unit to indicate the image size.
For example; if your image takes up the whole width of the viewport, you can simply type;

```tsx
<Image image={image} layout="responsive" width={16} height={9} sizes="100vw" objectFit="cover" />
```
Copy

## Image Component Props
`image`IkasImagerequired

`IkasImage` object is provided instead of an `src` attribute.
Image component creates a `srcset` internally with the given IkasImage object.

`layout`"fill" | "fixed" | "intrinsic" | "responsive" | undefined

Layout value to determine rendering method of the image.

`width`number | string | undefined

The width of the image, in pixels. Must be an integer without a unit.
Required except for images with `layout="fill"`.

`height`number | string | undefined

The height of the image, in pixels. Must be an integer without a unit.
Required except for images with `layout="fill"`.

`sizes`string | undefined

A sizes string describing the responsive image size to the browser.
Should be provided if the layout type is `responsive` or `fill`.

`objectFit`fill | contain | cover | none | scale-down | undefined

Defines how the image will fit into its parent container when using `layout="fill"`.
This value is passed to the object-fit CSS property for the src image.

`objectPosition`fill | contain | cover | none | scale-down | undefined

Defines how the image is positioned within its parent element when using `layout="fill"`.
This value is passed to the object-position CSS property applied to the image.

`priority`boolean | undefined

When true, the image will be considered high priority and preload. Lazy loading is automatically disabled for images using priority.
Should be used to increase performance on largest images that affects the initial load time of the page.
For example; if you have a large banner component with an image, you might want to give it priority to increase page performance.
next/image priority docs

`useBlur`boolean | undefined

Image component internally provides a blurDataUrl
to the underlying `NextImage` component, if you set `useBlur` to true.
Your image will have a very small sized, blurred image as a placeholder before the actual image finishes loading.

## Summary
For every image that you are going to render in your theme, whether it directly comes from an `Image` prop type,
or from another model like IkasProductVariant, you will always have an `IkasImage` object available for you, and you are expected to render it
with the `Image` component from `@ikas/storefront` package.
Image sizes differ from merchant to merchant, some of them might upload square images, while some of them prefer rectangle sizes.
To provide the most customizable images to your merchants, you can add props to allow the merchants to fit their images inside your
components as the way they like. Some examples to these props;

- `objectFit` You can create an enum type,
and ask the merchant whether or not they want the image to cover or fit the container.

- `aspectRatio` You can create an enum type, with options like `16:9`, `4:3`, `1:1` etc,
and size the images in your component accordingly.

- `mobileImage` You can ask the merchant for a completely different image for the mobile devices.

The list goes on, and it is up to you as a theme developer to provide the most customizable and generic solution for your theme merchants.
