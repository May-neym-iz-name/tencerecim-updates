<!-- kaynak: https://ikas.dev/docs/theme/getting-started/introduction -->

# Introduction

note
This documentation covers Headless Themes. Our new theme development environment, ikas Studio, will be announced soon. For updates, follow us on Twitter at @ikasbuilderstr.

Themes are the building block of ikas storefronts.
Themes determine the way a storefront looks, it functions and it is basically the heart of all e-commerce journey of the ikas merchants.
As a theme developer, your job is pretty simple.
You are responsible for creating React components that can be customized with our theme editor.
You won't be coding a whole page, instead you will be coding puzzle pieces that the merchants can use on whichever page they want.
ikas themes are built upon Next.js, Typescript
and MobX.
However, you don't need a deep knowledge of Next.js and MobX to start coding your components.
ikas storefront libraries take care of all the heavy lifting for you, and allows you to focus on writing only UI related code.
Most of your time during your theme development journey will be spent on coding CSS.
warning
ikas theme development is still in beta, meaning that there can still be major changes.
This documentation page itself is also still under development, meaning that not all features are currently explained here.
This version of the docs is only for early access and beta testers.
Please submit your feedbacks and bug reports to our Github Page
or to our Discord Server.

info
Join our Discord Server to keep in touch with us,
and quickly get answers for your questions about the development process. The dev team will try their best to help you out!

## Partner Interface
Before starting out your theme development journey, you need to create an ikas partner account
from the Partner Interface, and follow these steps;

- Create a Development Store.
- Create a Theme and obtain your Theme Config.

## Creating Your First Theme
Open up a terminal, and execute the following command.
Follow the steps and it will create the theme template on your computer.

```bash
npx create-ikas-theme@latest
```
Copy

Copy and paste your theme config into your config.json file.
You can then go into your theme's folder and run it;

```undefined
cd your-theme
yarn install
yarn dev
```
Copy

Now you can access your theme at http://localhost:3333.
warning
Currently we only support yarn package manager. Support for other package managers will be available soon.
For the time being, please use yarn to install dependencies and run your theme.

Let's examine the folder structure before moving on to the theme editor;

## Theme Folder Structure
As mentioned earlier, ikas themes are built upon Next.js.
Folder structure is the same as a classic Next.js project.

- `components` folder is the place where you will be writing your components.
`components/__generated__` folder contains some auto generated files, that you can't modify manually.

- `pages` folder is also an auto-generated folder, and you cannot modify these files.
If you add or edit any page file, they will be overridden when you upload your theme.
The only files that you are allowed to edit in this folder are pages/_app.tsx and
pages/_document.tsx.
You can edit these files to install CSS libraries and put your global imports etc.
Make sure not to delete existing theme template code in those files while you add your own code.

- `store` folder is the place to create your own MobX stores to share global state between your components, if necessary.

- `theme.json` is also an auto-generate file, which contains all of your component declarations. Do not modify the contents of this file manually.

- `config.json` is a file contains the credentials for your theme and test store.
You will copy and paste the credentials given to you from Theme Config into this file.

- `next.config.js` is the config file for Next.js that we created with some default settings for our purposes.
There are some cases when you might want to modify this file, like testing your localization files,
which we explain in greater detail in the Localization section.

.next

node_modules

public

src

typings

.babelrc

.env

.gitignore

config.json

next-env.d.ts

next.config.js

package.json

prettierrc.js

README.md

tsconfig.json

yarn.lock
