<!-- kaynak: https://ikas.dev/docs/theme/prop-types/category -->

# Category

Category prop type allows you the display information about a category.
The prop type you get is an instance of IkasCategory class.
The checkbox `Use the category of the page`, will only be visible if your component is added to the `Category Page`,
so that the merchants can provide the page's category dynamically to your component.
However, if your component is added to a page other than the `Category Page`,
this checkbox will not be visible, and merchants will have to select a specific category manually.

```tsx
export type CategoryTestProps = {
  ... your other props
  category: IkasCategory;
}
```
Copy
