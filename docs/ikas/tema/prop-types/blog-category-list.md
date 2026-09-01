<!-- kaynak: https://ikas.dev/docs/theme/prop-types/blog-category-list -->

# Blog Category List

Blog category list prop type allows you the display a list of blog categories.
These blog categories can either be manually selected by the merchant, or can be fetched for you from the API automatically.
There are 2 types of blog category list, each explained below.
The prop type you get is an instance of IkasBlogCategoryList class.
The `data` field inside this class will contain an array of IkasBlog.
You can check the IkasBlogCategoryList reference for more info.
Then you can check the usage of this class from the Example Theme page.

```tsx
export type BlogCategoryListExampleProps = {
    ...
    blogList: IkasBlogCategoryList;
};
```
Copy

## All
The type `All` of the blog category list allows you to display all blog categories of the merchant,
with pagination functions provided by the IkasBlogCategoryList class.
Initial request for the first page of the blog categories will automatically be sent for you,
so you don't have to call anything for the first page.
Merchants can also select the `Initial Limit` for the page size.

## Static
The type `Static` of the blog category list allows the merchant to select specific blog categories.
Since the list is static, you won't be needing any pagination functions, and only display the
provided blog categories. Currently we do not provide a limit to the amount of blog categories to be added.
You can however, limit the blog categories rendered inside your components.
