<!-- kaynak: https://ikas.dev/docs/theme/theme-settings/colors -->

# Colors

Color section allows you to define global colors for your theme.
Use these colors to define a customizable color schema for your theme.
Colors are automatically defined as a CSS Variable,
so that you can use them in your styles easily.
If you need to access the color code in Typescript, the
value will be passed to your components in the `settings` prop value. Settings
object is an instance of the IkasThemeJsonSettings class.
You can use the `colors` array of this class, to find the color you need with your given css key.
