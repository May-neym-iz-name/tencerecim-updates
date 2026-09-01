<!-- kaynak: https://ikas.dev/docs/theme/example-theme/account/account-detail/favorite-products -->

# Favorite Products

Favorite products component lists the favorite products of the customer.
Here is the full source code.
Here is how our favorite products component looks like;
The logic for our favorite products component is in the
useFavoriteProducts
custom hook. It uses the store.customerStore.getFavoriteProducts()
function to fetch the list of favorite products. To remove a product from the list,
store.customerStore.removeProductFromFavorites(product.id) can be used.
