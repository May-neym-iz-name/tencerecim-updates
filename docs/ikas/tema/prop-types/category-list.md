<!-- kaynak: https://ikas.dev/docs/theme/prop-types/category-list -->

# Category List

Category list prop type allows you to display multiple categories in your components.
These categories can either be manually selected by the merchant, or can be fetched for you from the API automatically.
There are 2 types of category list, each explained below.
The prop value you get is an instance of IkasCategoryList.
The `data` field inside this class will contain an array of IkasCategory.
You can check the IkasCategoryList reference for more info.

```tsx
export type CategoryListExampleProps = {
    ...
    categoryList: IkasCategoryList;
};
```
Copy

## All
The type `All` of the category list allows you to display all categories of the merchant,
with pagination functions (getNext, getPrev, getPage) provided by the
IkasCategoryList class.
Initial page of the categories will automatically be fetched for you on the server side.
Merchants can also select the `Initial Sort` and `Initial Limit` for the sort type and page size.

## Static
The type `Static` of the category list allows the merchants to select specific categories.
Since the list is static, you won't be needing any pagination functions, and only display the
provided categories. Currently we do not provide a limit to the amount of categories to be added.
You can however, limit the categories rendered inside your components.
