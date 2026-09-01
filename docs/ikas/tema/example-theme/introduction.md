<!-- kaynak: https://ikas.dev/docs/theme/example-theme/introduction -->

# Introduction

Let's go over the components of a complete theme and learn about the most important features along the way.
We will only show related code about the feature we want to teach,
and also provide you links to the whole file/code so you can check the full code when you need to.
Here is the complete theme source code.
warning
This section assumes that you have read the Getting Started
section. Therefore, we will not explain how to create components and props from the theme editor in this section.

## Code Style
Our example theme is using Styled Components instead of plain CSS.
We use this library to keep our render methods as clean and readable as possible,
and to better communicate what the component actually renders.
As you can see in this example, you can imagine what kind of layout the header has
just by reading the component names.

```tsx
<S.Header>
  <Container>
    <S.InnerContainer>
      <LeftSide {...props} />
      <Center {...props} />
      <RightSide {...props} />
    </S.InnerContainer>
  </Container>
</S.Header>
```
Copy

If we were to use plain html elements with classnames,
here is how the same render method would look like.
It is harder for the eye to read this, especially if there were more then two nested divs,
and more then one class for the divs.

```jsx
<div classname="header">
  <Container>
    <div classname="inner-container">
      <LeftSide {...props} />
      <Center {...props} />
      <RightSide {...props} />
    </div>
  </Container>
</div>
```
Copy

You don't have to use this library for your own themes, we use it here just to make example codes as readable as possible.
