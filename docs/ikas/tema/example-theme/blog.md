<!-- kaynak: https://ikas.dev/docs/theme/example-theme/blog -->

# Blog

A blog page is where a blog post can be read in detail.
All of the given information while creating the blog post
such as content, author, date, category, etc. can be displayed here.
Here
is the full source code.
Here is how the generated type looks like.
src/components/__generated__/types.ts

```tsx
export type PageBlogsProps = {
    blog: IkasBlog;
  ...
};
```
Copy

Here is how our blog component looks like:
You can check the source code here.
Please note that a blog post content is saved as Rich Text from the blog editor.
The data you will receive is going to be an html text.
To render the blog content html, we use the dangerouslySetInnerHTML prop.
