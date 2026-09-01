<!-- kaynak: https://ikas.dev/docs/theme/translations -->

# Translations

You can translate your themes to support multiple locales.
There are several areas that you need to translate.

- You need to translate your theme's components and props, basically definitions of your theme
as described in the Translations page.
- You need to create locale files for the static texts in your components, as described below in the
Creating Locale Files section.
- You need to translate your component's default prop values, as described below in the
Translating Default Prop Values section.

## Creating Locale Files
While developing your components, you need to create locale files for the static texts in your components.
We create locale folders under public/locales folder, with the folders created withe the locale code,
like public/locales/en or public/locales/tr. Under these folders you can create locale files for
your components defined in the editor.
warning
You can't create locale files for your sub-components, only components defined in the editor can have seperate locale files.
Sub-components either use their parent's file, or the common.json file.

public

The names for this locale files should be the same name as the component directory name.
For example, if you have a component `src/components/product-detail`, your locale file name
for this component should be product-detail.json.
note
common.json is a special locale file, and its contents will be accessible from
all components. You can put common translations in this file.

### Locale File Format
Locale files are plain JSON objects, containing key value pairs.
You can nest objects as you see fit.
You can also create variables by wrapping variable names with {{ }}
curly braces, as you see in the json example below.
public/locales/en/product-detail.json

```json
{
  "detail": {
    "addToCart": {
      "text": "ADD TO CART"
    }
  },
  "settings": {
    "required": "This field is required",
    "minMax": "Must be a minimum of {{min}} characters and a maximum of {{max}} characters",
    "min": "Must be a minimum of {{min}} characters",
    "max": "Must be a minimum of {{max}} characters",
    "selectMinMax": "Minimum {{min}}, maximum {{max}} selections should be made",
    "selectMin": "Minimum {{min}} selections should be made",
    "selectMax": "Maximum {{max}} selections should be made",
    "maxFileSizeInfoText": "You can upload files up to 3 MB in size."
  }
}
```
Copy

### Using The Locale Files
You can use the useTranslation hook in your components to get access to the translations.
This hooks returns a function t which you can use to get the translated texts.
The first parameter this function needs is the path for the text, starting with the namespace (locale file name)
followed by the path of the text in the locale file. t('namespace:path.to.text')

```tsx
import { useTranslation } from '@ikas/storefront';

const Address = ({ order }: Props) => {
  const { t } = useTranslation();
  return (
    <S.Address>
      <S.DeliveryAddress>{t('common:orderDetail.deliveryAddress')}</S.DeliveryAddress>
      <S.Text>
        <div>
          {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
        </div>
        <div>{order.shippingAddress?.addressText}</div>
      </S.Text>
    </S.Address>
  );
};
```
Copy

The second paramer of this function accepts variable values. For example, if you have
a variable {{min}}, you can pass the following object to the second parameter;

```tsx
t('product-detail:settings.min', {
  min: 10,
});
```
Copy

warning
You can only access the common and your component specific namespace with the t function.
You can't access other component's locale files.
Your sub-components can use the t function to access their parent's locale files.

### Switching Locales During Development
The next.config.js file in your theme contains an i18n section. This section
allows you to set available locales and set the default locale.
You can add your supported locales to your next.config.js.
You can change the defaultLocale to test the specific locale from directly http:://localhost:3333,
or you can navigate to the locale path, http://localhost:3333/en, to test your locales.
Make sure to restart your theme after changing this file.

```undefined
...
i18n: {
  defaultLocale: "en",
  locales: ["en", "tr"],
  localeDetection: false,
},
...
```
Copy

## Translating Default Prop Values
When we are defining our component props, the editor ask us to provide default values for them.
We have the ability to provide different default values for different languages.
