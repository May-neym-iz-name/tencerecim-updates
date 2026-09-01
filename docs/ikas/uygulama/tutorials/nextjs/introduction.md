<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/introduction -->

# Introduction

Next.js is a React framework that provides the all features you need for both the client and server sides. You can check nextjs.org for detailed documentation and examples.

## Objectives
In this tutorial, you will:

- Create a basic Next.js app.
- Authorize your app through the ikas dashboard and your app.
- Authenticate merchant via connect API (for external apps).
- Authenticate merchant via ikas app bridge.
- Retrieve data from ikas via ikas API client.
- Fulfill order on ikas.
- Register webhooks and receive a webhook with ngrok.

## Before You Begin
This tutorial requires:

- Intermediate knowledge of JavaScript, TypeScript, HTML, CSS and SCSS
- Basic knowledge of React and Next.js

### Install ngrok:

- Install ngrok to your computer from this link.
After installation runs the following command to open the local port to the internet.

```bash
ngrok http 3000
```
Copy

- Save the forwarding URL from your terminal from now we will refer to this address as `NGROK_URL` on the following pages.

### Create App ikas Partners

- Register new partners account or login to your partners account.
- On Apps page click Create New App button.
- Fill required fields like screenshot below, Replace `my-tunnel.ngrok.io` with your `NGROK_URL`:
warning
If your `NGROK_URL` changes you should update it on Partners Dashboard and your project .env file.

### Install Redis
We will use Redis as key-value storage for this project because it is lightweight and this tutorial does not require any complex query requirements. You can use any other database solution that you like most.
