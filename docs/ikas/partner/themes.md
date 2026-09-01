<!-- kaynak: https://ikas.dev/docs/partner/themes -->

# Headless Themes

Themes page of the partner interface allows you to manage your themes.
You need to create a theme from this page first, before you start developing your theme.

## Creating a Theme
Go to https://partners.ikas.com/admin/headless-themes (this page is not accessible from the sidebar).
Click on the Create New Theme button on the Themes page.
Enter a name for your theme, and provide some screenshots if available.
You can add these screenshots later as well, its okay to leave them empty for the first time.

note
Themes are created as Private by default, meaning that the users won't be able to see your theme
in the dashboard while selecting a theme
for their stores. To make a theme Public and let all users use your theme,
you will need to create Theme Listing and submit your theme. Theme listings are currently closed as the
theme development is still in beta.
You can check the Allowed Stores section to learn more about how
to allow specific stores to use your theme.

## Theme Details
After you create your theme, you can view it's details by clicking on the table row on the theme list page.

### Theme Configuration
This section provides the theme development credentials for the selected store/storefront pair.
You can switch your theme credentials between different stores to use their data during your theme development.
Copy and paste this config into the `config.json` file in your theme project.
The stores visible here are your own dev stores and the stores that your partner account is connected to.
You can learn more about connecting to stores from the Stores page.

### Allowed Stores
This section allows you to manage which stores can access your theme. If your theme is Private (by default all themes are),
you need to give access to specific stores to use your theme. If you have completed your theme
or you want to test it out on the production environment,
and uploaded it's source code from the theme editor,
you will now be able to allow stores to use your theme.
You can only allow stores that your partner account is connected to.
You can learn more about connecting to stores from the Stores page.
Assuming that you have uploaded your source code,
and you have successfully connected to a store,
you can now allow that store to use your theme.

After you allow a store, the user's of that store will be able to select your theme in their storefront theme list.

### Theme Versions
This section allows you to manage your theme versions.
When you upload your theme source code from the theme editor,
a new theme version will be created. You can check the build status of that version from this section.
