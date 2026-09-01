<!-- kaynak: https://ikas.dev/docs/theme/prop-types/blog-list -->

# Blog List

Blog list prop type allows you the display a list of blog posts.
These blog posts can either be manually selected by the merchant, or can be fetched for you from the API automatically.
There are several types of blog list, each explained below.
The prop type you get is an instance of IkasBlogList class.
The `data` field inside this class will contain an array of IkasBlog.
You can check the IkasBlogList reference for more info.
Then you can check the usage of this class from the Example Theme page.

```tsx
export type BlogListExampleProps = {
    ...
    blogList: IkasBlogList;
};
```
Copy

## All
The type `All` of the blog list allows you to display all blog posts of the merchant,
with pagination functions provided by the IkasBlogList class.
Initial request for the first page of the blog posts will automatically be sent for you,
so you don't have to call anything for the first page.
Merchants can also select the `Initial Limit` for the page size.
The `Use page data as filter` checkbox, will only be visible if your component is added to the `Blog Category Page`.
If the merchant checks this checkbox inside this page, then the blog list will automatically
be filtered by the current page's blog category.

## Static
The type `Static` of the blog list allows the merchant to select specific blog posts.
Since the list is static, you won't be needing any pagination functions, and only display the
provided blog posts. Currently we do not provide a limit to the amount of blog posts to be added.
You can however, limit the blog posts rendered inside your components.

## Category Blogs
The type `Category Blogs` of the blog list allows the merchant to select all blog post that
belongs to a specific blog category.
