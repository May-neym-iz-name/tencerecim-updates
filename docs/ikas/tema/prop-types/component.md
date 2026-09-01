<!-- kaynak: https://ikas.dev/docs/theme/prop-types/component -->

# Component

Component prop type allows you to create highly customizable layouts inside your components.
You can let the merchant select a component to render in a specific area inside your component.
The prop value you get is an instance of IkasComponentRenderer.
Let's say you want to create a component with a 2-column layout,
and let the merchant select whatever they want to display in these columns.

Let's add our `Columns` component to the page now.

Here is a better example from one of the ikas merchants.

We currently do not limit which components can be selected by the merchant,
they can select every component available in the editor,
just like adding a component for a normal page.
