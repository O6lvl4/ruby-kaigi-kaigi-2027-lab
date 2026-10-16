// "/restaurants" ごはん・人数: group-size filter, sortable list, and map view.
import { initRestaurantGuide } from '../features/restaurants/restaurant_guide.js';
import { initRestaurantSort } from '../features/restaurants/restaurant_sort.js';

export function restaurantsPage({ rendered }) {
  return {
    data: ['/restaurants.json'],
    mount(root) {
      const stopGuide = initRestaurantGuide(root, rendered('/restaurants.json').body.restaurants);
      const stopSort = initRestaurantSort(root);
      return () => {
        stopGuide?.();
        stopSort();
      };
    }
  };
}
