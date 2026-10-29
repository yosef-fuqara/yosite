/** Document Y of an element — stable while scrolling (unlike getBoundingClientRect). */
export function pageTop(element) {
  let top = 0;
  let node = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}
