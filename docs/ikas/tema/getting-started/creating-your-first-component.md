<!-- kaynak: https://ikas.dev/docs/theme/getting-started/creating-your-first-component -->

# Creating Your First Component

If you have completed the steps from the
Creating Your First Theme and
Opening The Theme Editor,
you are now ready to create your first component.

## Creating Component Files
For the purposes of learning, let's create a very simple `Title` component that takes a `string` as a prop,
and displays it in the center of the page.

Here is the code for index.tsx;
src/components/title/index.tsx

```tsx
import { observer } from 'mobx-react-lite';
import styles from './style.module.css';

const Title = () => {
  return <div></div>;
};

export default observer(Title);
```
Copy

Nothing fancy here, we just render an empty div.
Notice however the way we import `observer` and export the component as a default export and wrapping it with `observer`.
This is the only thing that you need to know about MobX to develop an ikas theme. You have to import `observer`,
and export every component you write with a default export wrapped inside `observer`.
If you don't export your components this way, you can't add them to the editor.
Also for simplicity's sake, we will just write plain old CSS, but you can choose the way you want to write styles later.

## Defining a Component
Now we need to define this component in the Theme Editor first,
so that we can add this component to any page as a section.
note
We use the word `Section` instead of `Component` in the editor because it seems less technical to the end users.
However you will still see the word `Component` on the developer specific screens.

- Open up your editor
`https://your-store.myikas.com/admin/storefront/partner/theme/edit`

## Using the Prop Values
Up until now, we have only described what type of data our component needs from the merchant.
However, we still can't see our component in the editor, or at `http://localhost:3333`.
Well, thats because we are still rendering an empty div. Lets change our component now to actually display the `title`
value that we receive from the editor. Copy and paste the following code into their respective files.
src/components/title/index.tsx

```tsx
import { observer } from 'mobx-react-lite';
import styles from './style.module.css';
import { TitleProps } from '../__generated__/types';

const Title: React.FC<TitleProps> = (props) => {
  const { title } = props;
  return <div className={styles.title}>{title}</div>;
};

export default observer(Title);
```
Copy

src/components/title/style.module.css

```css
.title {
  padding: 36px 0;
  font-size: 48px;
  font-weight: 500;
  text-align: center;
}
```
Copy

We have changed our component so that its prop types are explicitly defined with Typescript.
We have done that by using our auto-generated `types` file. This file will export all of your component's prop types
and all of your custom data definitions. For our current component we use the `TitleProps` type exported from this file.
src/components/__generated__/types.ts

```tsx
...
export type TitleProps = {
  title: string;
};
...
```
Copy

After you perform these steps, save your files and go back to the editor.
You should now scroll to the bottom of the page, and can see your component with the title rendered.

Thats it! You have now created your first component.
You can add more of the same component to the page, change the order of them,
edit their title values etc, just like an actual merchant would.
