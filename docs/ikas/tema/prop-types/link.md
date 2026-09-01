<!-- kaynak: https://ikas.dev/docs/theme/prop-types/link -->

# Link

Link prop type allows the merchants to create a navigation link.
This link can be used to navigate to another page in the theme or to an external link.
It allows you to ask the merchant for a single link,
as well as nested sub-links to create a navigation menu structure.
Let's create a simple component that displays a button to navigate to another page.

Link prop type has its own model IkasNavigationLink and
we use the `Link` component from `@ikas/storefront` package that extends from next/link to
render these links in our components. `next/link` allows prefetching and lazy loading of
links to improve performance.
Every link you have in your components,
whether it comes from a `Link` prop type or from a model like IkasProduct,
should be used with `Link` component, otherwise you will lose the benefits of
Next.js routing system and cause unnecessary full page re-loads while navigating between links,
which in turn slows down your theme significantly.
src/components/link-prop/index.tsx

```tsx
import { Link } from '@ikas/storefront';
import { observer } from 'mobx-react-lite';
import { LinkPropProps } from '../__generated__/types';
import styles from './style.module.css';

const LinkPropDemo: React.FC<LinkPropProps> = (props) => {
  const { link } = props;

  // Normaly it doesn't make much sense to display only a button in a component
  // This is just to demonstrate the Link prop type
  return (
    <div className={styles.container}>
      <Link href={link.href} passHref>
        <a className={styles.button}>{link.label}</a>
      </Link>
      {/* {link.subLinks.map((sl) => (
        ...
      ))} */}
    </div>
  );
};

export default observer(LinkPropDemo);
```
Copy

src/components/link-prop/style.module.css

```css
.container {
  padding: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.button {
  padding: 8px 12px;
  background-color: #6f55ff;
  color: white;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
}
```
Copy

## Programmatic Navigation
If you want to navigate to a certain link programmatically, you may be tempted to use
window.location object.
However if you use window.location to change the route, merchants clicking on your links in the theme editor preview
will cause the preview url to change, meaning that they won't be able to edit props on your theme.
To prevent this behaviour and to let Next.js handle all routing,
you must use next/router to navigate to a new url programmatically.

- router.push
- router.replace

## Summary
Link prop value is the way we allow the merchants to create navigation for their storefronts.
They can create sub-links, external links, links to a specific product or category page,
or to specific a section of a specific page.
It is up to you to allow nesting of links and how many levels of nesting you support.
If you are building a navigation menu for a header component, you might want to support at least 2 or 3 levels of nesting.
We currently do not have a limit on the nesting level for the links, the limit will be determined by your component.
We might add an additional validation property like `maxSubLinkLevel` to the `Link` prop type to limit the nesting levels
in a future release.
