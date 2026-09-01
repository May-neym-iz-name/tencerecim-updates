<!-- kaynak: https://ikas.dev/docs/theme/prop-types/custom-data -->

# Custom Data

The basic prop types might not be enough to provide all the data
needed for your components. That is where the custom data types come into play.
You can create your own specific data types for your components.
Lets explain this with an example. Suppose you have a slider component,
in which you show slides of images, with an optional title and button displayed on top of the images.
If you only needed to display a single slide, you could do it with using basic prop types
with these props;

```tsx
export type SlideTestProps = {
  ... your other props
  image: IkasImage;
  title?: string;
  buttonLink?: IkasNavigationLink;
}
```
Copy

However, for a slider component, the merchant should be able to add multiple slides,
which means that you need to ask for an array of this slide data.
Let's define this array as a custom data type.

After you defined your custom data, you can then use it as a prop in your components.
Let's define our 'Slider' component.

Let's have a quick look at the source code.

Let's add our component to a page now to see how the editor displays
our custom data.

Here is the full source code for the slider component.

## Summary
Custom data types allows you to combine the other prop types, and allows you to create any data structure you want.
We have managed to create a very specific data type for our own needs,
and the merchant is able to provide values for this data type very similar to the original prop types.
We also saw how we can nest the custom data types, especially usefull for enums, to use them multiple times in different custom data types.
Most of your components will require custom data types, and you will use this prop type heavily in your components.
Be mindful of your data design and keep in mind that the more complex data you ask the merchants,
the more confusing it will become for them to provide values. Provide descriptions for each data row where necessary,
and try to keep nesting data structures to minimum where possible.
