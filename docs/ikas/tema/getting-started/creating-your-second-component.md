<!-- kaynak: https://ikas.dev/docs/theme/getting-started/creating-your-second-component -->

# Creating Your Second Component

Now that we have created your first component, and understand how to define components in the editor,
we can create a component with more props and customization options. We will also explain the Conditional Prop Type
and the Group fields for the Add Prop modal.
We will create a Banner component, that will display an image and a button.
Colors of the button will be customizable by the merchant.
Start by creating the folder banner for this component, and the 2 files index.tsx and style.module.css.
src/components/banner/index.tsx

```tsx
import { observer } from 'mobx-react-lite';
import styles from './style.module.css';

const Banner = () => {
  return <div></div>;
};

export default observer(Banner);
```
Copy

## Defining the Banner Component

Now that we have defined our Banner component, we can change our code to use the props we've just defined.

## Adding the Banner Component to a Page

## Grouping Props

## Conditional Props
If the Show button prop value is false/closed, we don't need to show the other 3 button props.
We can show/hide our customization props depending on the value of the Show button prop.

You can also use Enums to achieve the same result.
If you have an enum prop type Position with values Left, Right and Center,
you can show/hide different props when the merchants select Left, and different props when they select Right etc.

## Banner Source Code
src/components/banner/index.tsx

```tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import styles from './style.module.css';
import { BannerProps } from '../__generated__/types';
import { Image, Link } from '@ikas/storefront';

const Banner: React.FC<BannerProps> = (props) => {
  const { image, showButton, buttonLink, buttonBgColor, buttonTextColor } = props;

  const buttonStyle = React.useMemo(() => {
    return {
      backgroundColor: buttonBgColor ?? 'black',
      color: buttonTextColor ?? 'white',
    };
  }, [buttonBgColor, buttonTextColor]);

  return (
    <div className={styles.banner}>
      <Image image={image} layout="responsive" width={16} height={9} objectFit={'cover'} />
      <div className={styles.buttonContainer}>
        {showButton && buttonLink && (
          <Link href={buttonLink?.href} passHref>
            <a className={styles.button} style={buttonStyle}>
              {buttonLink.label}
            </a>
          </Link>
        )}
      </div>
    </div>
  );
};

export default observer(Banner);
```
Copy

src/components/banner/style.module.css

```tsx
.banner {
  width: 100%;
  position: relative;
}

.buttonContainer  {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;

  width: 100%;
  height: 50px;
  display: flex;
  justify-content: center;
}

.button {
  padding: 0 12px;
  height: 50px;
  border-radius: 4px;
  background-color: black;
  color: white;
  font-weight: bold;
  transition: all .3s;

  display: flex;
  justify-content: center;
  align-items: center;
}

.button:hover {
  transform: scale(1.05);
}
```
Copy
