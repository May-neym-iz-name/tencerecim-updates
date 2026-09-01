<!-- kaynak: https://ikas.dev/docs/theme/example-theme/blog-list -->

# Blog List

The Blog List Page is where all of the blog posts listed.
Each blog post displayed as Blog Card according to its publication date in the list.
Here is the full source code.
Here is how this component looks like in blogs page:
Here is how the generated type looks like.
src/components/__generated__/types.ts

```tsx
export type PageBlogsProps = {
  blogList: IkasBlogList;
  title?: string;
  showAuthor?: boolean;
  showDescription?: boolean;
  showCategory?: boolean;
  showPublishedDate?: boolean;
  imageAspectRatio: ImageAspectRatio;
};
```
Copy

IkasBlogList is being used for displaying the blog list.
We use blogList.data to display every blog post as Blog Card.
We use the blogList.hasPrev and blogList.hasNext pagination fields to check whether
the merchant can paginate to a previous/next page.
We use the getPage function to fetch a new page of blogs. You can also use the
getNext and getPrev functions of the IkasBlogList.
Check the pagination component.
Other props are here to provide customization options to the merchants.
They allow the merchants to customize their blogs page as much as possible.
