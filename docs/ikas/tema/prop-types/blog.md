<!-- kaynak: https://ikas.dev/docs/theme/prop-types/blog -->

# Blog

Blog prop type allows you to display information about a blog post.
The prop type you get is an instance of IkasBlog class.
The checkbox `Use the blog post of the page`, will only be visible
if your component is added to the `Blog Post Page`, so that the merchants can
provide the page's blog post dynamically to your component.
However, if your component is added to a page other than
the `Blog Post Page`, this checkbox will not be visible,
and merchants will have to select a specific blog post manually.

```tsx
export type BlogTestProps = {
  ... your other props
  blog: IkasBlog;
}
```
Copy
