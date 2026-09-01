<!-- kaynak: https://ikas.dev/docs/theme/prop-types/rich-text -->

# Rich Text

Rich Text prop type asks the merchant for a styled text input.
The editor displays the merchant a mini rich text editor, where they can change the size of the text,
or some alignment styles or they can create links and even add images.
You will receive a string containing html code with inline styles or wrapped with some basic html styling elements, like `strong` or `h1` to increase font size and weight.
You will need to use `dangerouslySetInnerHTML` to display the contents of this string in your components.
Make sure the inline styles that are sent in this string, are not being overriden by your CSS libraries or your own global CSS code.
Try to provide a WYSIWYG experience to your merchants.
