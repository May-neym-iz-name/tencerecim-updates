<!-- kaynak: https://ikas.dev/docs/theme/example-theme/hero-banner -->

# Hero Banner

Let's create a hero banner component for our theme.
This component will display an image, a title, and a call to action button.
Here is the full source code.
Here is how our hero banner will look like;

## Props
In order to achieve the end result in the screenshot,
we need to ask the merchant for some prop values in the theme editor.
We need the image, the title and some customization props for the call to action button.
Since the button is optional, we use a showButton prop to hide/show it,
and other button related props are created as conditional props, meaning that they will only be
visible in the editor when the showButton prop value is true.
Here is how the generated type looks like.
src/components/__generated__/types.ts

```tsx
export type HeroBannerProps = {
  image: IkasImage;
  imageAspectRatio: ImageAspectRatio;
  title?: string;
  showButton?: boolean;
  link: IkasNavigationLink;
  buttonBackgroundColor: string;
  buttonTextColor: string;
};
```
Copy

Here is how the hero banner component looks like.
src/components/hero-banner/index.ts

```tsx
function HeroBanner({
  image,
  link,
  title,
  imageAspectRatio,
  buttonBackgroundColor,
  buttonTextColor,
  showButton,
}: HeroBannerProps) {
  const isContentVisible = (showButton && !!link?.label && !!link?.href) || !!title;
  const contentProps = {
    title,
    showButton,
    link,
    buttonTextColor,
    buttonBackgroundColor,
  };

  return (
    <Container>
      <S.InnerContainer>
        <HeroBannerImage image={image} imageAspectRatio={imageAspectRatio} />
        {isContentVisible && <HeroBannerContent {...contentProps} />}
      </S.InnerContainer>
    </Container>
  );
}
```
Copy

As you can see, the component splits into 2 sub-components,
HeroBannerImage and HeroBannerContent. We render the image,
and use the button customization props to hide/show it, or change the colors.
