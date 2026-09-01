<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/country -->

# Country

```graphql
type Country {
  id: ID!
  capital: String
  currency: String
  currencyCode: String
  currencySymbol: String
  emoji: String
  emojiString: String
  iso2: String
  iso3: String
  locationTranslations: LocationTranslations!
  name: String!
  native: String
  phoneCode: String
  region: String
  subregion: String
}
```
Copy

#### Fields
`id`ID!required

`capital`String

Indicates the capital of the county.

`currency`String

Indicates the currency of the county.

`currencyCode`String

`currencySymbol`String

`emoji`String

Indicates the flag emoji of the county.

`emojiString`String

Indicates the flag emoji code of the county.

`iso2`String

The two-letter country code corresponding to the country.

`iso3`String

The three-letter country code corresponding to the country.

`locationTranslations`LocationTranslations!required

Shows spellings of country name in different languages.

`name`String!required

Country's name.

`native`String

Indicates the name of the country in the local language.

`phoneCode`String

The phone code corresponding to the country.

`region`String

Indicates the region of the county.

`subregion`String

Indicates the subregion of the county.
