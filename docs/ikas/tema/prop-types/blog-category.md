<!-- kaynak: https://ikas.dev/docs/theme/prop-types/blog-category -->

# Blog Category

Blog category prop type allows you to display information about a blog category.
The prop type you get is an instance of IkasBlogCategory class.

```tsx
export type BlogCategoryTestProps = {
  ... your other props
  blogCategory: IkasBlogCategory;
}
```
Copy

The checkbox `Use the blog category of the page`, will only be visible if your component is added to the `Blog Category Page`, so that the merchants can
provide the page's blog category dynamically to your component. However, if your component is added to a page other than
the `Blog Category Page`, this checkbox will not be visible, and merchants will have to select a specific blog category manually.
