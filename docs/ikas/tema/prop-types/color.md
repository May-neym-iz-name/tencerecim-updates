<!-- kaynak: https://ikas.dev/docs/theme/prop-types/color -->

# Color

Color prop type allows you to ask for a color value from the merchant.
You can use this prop type to let merchants customize text colors, button colors etc.
If you need global colors that you can use everywhere,
you can refer to the Global Colors page for more info.
The prop value you get is a hex color string.

```tsx
export type ColorExampleProps = {
    ...
    color: string;
};
```
Copy
