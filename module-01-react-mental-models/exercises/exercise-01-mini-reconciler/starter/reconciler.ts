/**
 * Mini Reconciler Exercise - Starter Code
 *
 * Your task: Implement the reconcile() function to efficiently update
 * the DOM based on changes between element trees.
 */

export type VElement = {
  type: string;
  props: Record<string, any>;
  children: (VElement | string)[];
  key?: string | null;
};

export type DOMNode = HTMLElement | Text;

/**
 * Reconcile two element trees and update the DOM
 *
 * @param prevElement - Previous element tree
 * @param nextElement - Next element tree
 * @param container - DOM container to render into
 * @param oldDOM - Previous DOM node (if exists)
 * @returns The new DOM node
 */
export function reconcile(
  prevElement: VElement | string | null,
  nextElement: VElement | string | null,
  container: HTMLElement,
  oldDOM: DOMNode | null = null
): DOMNode | null {
  // TODO: Implement reconciliation algorithm
  //
  // Hints:
  // 1. Handle null cases (mounting/unmounting)
  // 2. Handle text nodes
  // 3. Handle element type changes (replace entire subtree)
  // 4. Handle same type with different props (update props)
  // 5. Reconcile children (the hard part!)
  //
  // Your implementation here...

  throw new Error('reconcile() not implemented');
}

/**
 * Helper: Create a DOM node from a virtual element
 */
function createDOMNode(element: VElement | string): DOMNode {
  // TODO: Implement
  throw new Error('createDOMNode() not implemented');
}

/**
 * Helper: Update props on a DOM node
 */
function updateProps(
  domNode: HTMLElement,
  prevProps: Record<string, any>,
  nextProps: Record<string, any>
): void {
  // TODO: Implement
  // - Remove old props not in nextProps
  // - Add/update new props
  // - Handle special cases (className, style, event handlers)
}

/**
 * Helper: Reconcile children with keys
 */
function reconcileChildren(
  prevChildren: (VElement | string)[],
  nextChildren: (VElement | string)[],
  parentDOM: HTMLElement
): void {
  // TODO: Implement
  // This is the core of reconciliation!
  //
  // Algorithm:
  // 1. Build a map of prevChildren by key
  // 2. Iterate through nextChildren
  // 3. For each nextChild:
  //    - If key exists in prevChildren, update it
  //    - If key is new, create and insert
  // 4. Remove prevChildren not in nextChildren
  //
  // Bonus: Handle reordering efficiently
}

/**
 * Helper: Get key from element
 */
function getKey(element: VElement | string, index: number): string {
  if (typeof element === 'string') {
    return `text-${index}`;
  }
  return element.key ?? `index-${index}`;
}
