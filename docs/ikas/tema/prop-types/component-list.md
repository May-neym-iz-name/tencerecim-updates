<!-- kaynak: https://ikas.dev/docs/theme/prop-types/component-list -->

# Component List

Component list prop type is just the list version of the Component prop type.
Instead of selecting components one by one, you can let the merchants select multiple components in a single prop.

```tsx
export type ComponentListExampleProps = {
  ...
  components: IkasComponentRenderer[];
};
```
Copy
