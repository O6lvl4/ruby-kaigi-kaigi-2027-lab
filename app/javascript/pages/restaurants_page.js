// "/restaurants" ごはん・人数: group-size filter, list/map views.
import { initRestaurantGuide } from '../features/restaurants/restaurant_guide.js';

export function restaurantsPage({ rendered }) {
  return {
    data: ['/restaurants.json'],
    mount(root) {
      return initRestaurantGuide(root, rendered('/restaurants.json').body.restaurants);
    }
  };
}
