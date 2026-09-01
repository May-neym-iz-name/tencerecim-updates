<!-- kaynak: https://ikas.dev/docs/app/tutorials/nextjs/authorization/introduction -->

# Introduction

ikas uses OAuth2 Authorization Code Flow to grant access to an ikas store.
This flow can be started from both the ikas Dashboard and your app. We will cover both authorization flows in this tutorial.
caution
Your app must support both authorization flows.

For better understanding Authorization Code Flow you can check the following links:

- https://oauth.net/2/grant-types/authorization-code
- https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow

## Authentication APIs
We need to implement two APIs to start and complete authorization code flow on our app.
Before we start implementing our APIs, you should know that with the Next.js App Router, any file named `route.ts` within the `app` directory is treated as an API Route Handler. While they can be placed anywhere, for organizational purposes in this tutorial, we will place all our API routes within the `app/api` directory. For further reading, you can check this link.
