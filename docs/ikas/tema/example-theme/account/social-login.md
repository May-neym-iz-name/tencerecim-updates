<!-- kaynak: https://ikas.dev/docs/theme/example-theme/account/social-login -->

# Social Login

Social login functionality for Google and Facebook is available for all ikas themes.
The logic for the social login of our example theme is in the
useSocialLogin
custom hook.
Here are the steps to implement the social login;

- Call the store.customerStore.socialLogin function with either "google" or "facebook".
This function will redirect the merchant to the necessary page to login.
- After the merchant logins through the google or facebook, they will be redirected back to
your theme, with some query params attached. These query params are;
- socialLoginStatus, can be either "success" or "fail"
- socialLoginToken

- Check the socialLoginStatus and if its success, call the store.customerStore.socialLoginToken
function with the socialLoginToken param. This will complete the login process.
- As usual, if there is also the redirect param exists as described in the
Register Component Navigation,
you should redirect the merchant back to that url.
