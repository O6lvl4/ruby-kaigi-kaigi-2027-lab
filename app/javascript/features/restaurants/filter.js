// A restaurant matches when it is in the chosen area and its listed group size
// reaches the minimum. Unknown group sizes always stay visible ("人数要確認").
export function matchesRestaurantFilter(restaurant, minimum, area = 'all') {
  return (
    (area === 'all' || restaurant.area === area) &&
    (restaurant.groupCapacity === null || restaurant.groupCapacity >= minimum)
  );
}
