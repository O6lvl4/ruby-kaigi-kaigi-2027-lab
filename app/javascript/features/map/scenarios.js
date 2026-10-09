// Map scenarios rendered by Rails (MapScenariosController).
export const MAP_SCENARIOS = ['arrival', 'venue', 'night'];
export const scenarioPath = key => `/map/scenarios/${encodeURIComponent(key)}.json`;
