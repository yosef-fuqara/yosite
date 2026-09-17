/**
 * Physical tracks (not logical / RTL-flipped):
 * left  = enter below, travel upward, exit above
 * right = enter above, travel downward, exit below
 *
 * layer:
 * back  = passes behind the headline
 * front = selected cards that cross in front during the mid sequence
 */
export const SERVICE_CARDS = [
  {
    key: "webDesign",
    num: "01",
    track: "left",
    layer: "back",
    mark: "frames",
  },
  {
    key: "webDev",
    num: "02",
    track: "right",
    layer: "back",
    mark: "brackets",
  },
  {
    key: "ecommerce",
    num: "03",
    track: "left",
    layer: "front",
    mark: "bag",
  },
  {
    key: "motion",
    num: "04",
    track: "right",
    layer: "front",
    mark: "orbit",
  },
  {
    key: "landing",
    num: "05",
    track: "left",
    layer: "back",
    mark: "page",
  },
  {
    key: "seo",
    num: "06",
    track: "right",
    layer: "back",
    mark: "pulse",
  },
];

export const SERVICE_CARD_KEYS = SERVICE_CARDS.map((card) => card.key);
