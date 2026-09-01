<!-- kaynak: https://ikas.dev/docs/api/getting-started/authentication -->

# Authentication

ikas provides API's to make it possible for customers to create their custom integrations with Private Apps. Accessing ikas API is designed to be simple and secure. An access token should be used to authenticate with ikas APIs and send requests.

## Steps

- Create a Private App: Create your private app in ikas Dashboard.
- Get Access token: Get your access token for your Private App.
- Call API with Access Token: Calling ikas API with the access token.

### Create a Private App
To create your private app:

- Go to ypur ikas Dashboard https://<your_store_name>.myikas.com/admin.
- Navigate to Apps > My Apps page from sidebar.
- Click More and select Create Private App.
- Give a name to your app.
- Select scope of your app.
- Click Create to create your app.
When you successfully created your app, a client id and a secret will be generated automatically. You will need them in following steps of this tutorial.
note
Please keep your client secret secure as it can be used to get access to your ikas account.

### Get Access Token
To get access token, you need to use your `Client ID` and `Client Secret` generated in the eprevious private app creation step. ikas uses client_credentials OAuth flow for private app authentication. You can get your access token with following POST request.

- BASH
- NODE.JS

```bash
curl --request POST \
        --url 'https://<your_store_name>.myikas.com/api/admin/oauth/token' \
        --header 'content-type: application/x-www-form-urlencoded' \
        --data grant_type=client_credentials \
        --data client_id=<your_client_id> \
        --data client_secret=<your_client_secret>
```
Copy

```javascript
var axios = require("axios").default;
var options = {
  method: 'POST',
  url: 'https://<your_store_name>.myikas.com/api/admin/oauth/token',
  headers: {
    'content-type': 'application/x-www-form-urlencoded'
  },
  data: {
    grant_type: 'client_credentials',
    client_id: '<your_client_id>',
    client_secret: '<your_client_secret>'  // sizinti-tara: yok-say
  }
};
axios.request(options)
  .then((response) => {
    console.log(response.data);
  }).catch((error) => {
    console.error(error);
  });
```
Copy

#### Response

```json
{
  "access_token": "eyJz93a...k4laUWw",  // sizinti-tara: yok-say
  "token_type": "Bearer",
  "expires_in": 14400
}
```
Copy

### Call API with Access Token

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{me { id }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{me {
        id
  }}`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "me": {
      "id": "<your_client_id>"
    }
  }
}
```
Copy
