<!-- kaynak: https://ikas.dev/docs/theme/prop-types/link-list -->

# Link List

Link List prop type allows the merchant to enter several links.
The only differerence from the Link Prop Type is that you get an
array of IkasNavigationLink, rather than a single one.
You can render the links you get as described in the Link Prop Type.

```tsx
export type LinkListDemoProps = {
    ...
    linkList: IkasNavigationLink[];
};
```
Copy
