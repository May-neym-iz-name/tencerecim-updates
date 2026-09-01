<!-- kaynak: https://ikas.dev/docs/theme/prop-types/number-select-slider -->

# Number Select Slider

The `Number Select Slider` prop type allows you to to ask the merchant for a specific number value between a specific range.
While creating a prop with this type, you will be asked for the following info;

- Min value is the min value of the range.
- Max value is the max value of the range.
- Slider change interval is the interval at which you want the selected number to change.
For example if you set this to 10, number slider will increase/decrease by 10,
meaning that it will give you a value between 10,20,30 ... 100
- If the number you ask for has a unit, you can use the unit input to display the merchant that information.
In this example, we are asking the merchant for the width of something in our component,
so we specifically typed `px` to inform the merchant.
The prop type you get is of type IkasSlider.
This type will give you the value of the selected number as well as the unit you provided.
Here is how the merchant will see this slider in the editor.
