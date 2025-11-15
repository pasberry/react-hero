/**
 * Mini Reconciler - Complete Solution with Commentary
 *
 * This is a simplified version of React's reconciliation algorithm.
 * React's actual implementation is more complex, handling:
 * - Concurrent rendering
 * - Suspense
 * - Error boundaries
 * - Portals
 * - And much more...
 *
 * But the core concepts are the same!
 */

export type VElement = {
  type: string;
  props: Record<string, any>;
  children: (VElement | string)[];
  key?: string | null;
};

export type DOMNode = HTMLElement | Text;

// Track DOM operations for performance analysis
export const stats = {
  creates: 0,
  updates: 0,
  deletes: 0,
  reset() {
    this.creates = 0;
    this.updates = 0;
    this.deletes = 0;
  },
};

/**
 * Main reconciliation function
 *
 * Strategy: Compare elements level-by-level, applying minimal DOM operations
 */
export function reconcile(
  prevElement: VElement | string | null,
  nextElement: VElement | string | null,
  container: HTMLElement,
  oldDOM: DOMNode | null = null
): DOMNode | null {
  // Case 1: Unmounting (next is null)
  if (nextElement === null) {
    if (oldDOM) {
      container.removeChild(oldDOM);
      stats.deletes++;
    }
    return null;
  }

  // Case 2: Mounting (prev is null)
  if (prevElement === null) {
    const newDOM = createDOMNode(nextElement);
    container.appendChild(newDOM);
    stats.creates++;
    return newDOM;
  }

  // Case 3: Text node changes
  if (typeof prevElement === 'string' || typeof nextElement === 'string') {
    if (prevElement !== nextElement) {
      const newDOM = createDOMNode(nextElement);
      if (oldDOM) {
        container.replaceChild(newDOM, oldDOM);
      } else {
        container.appendChild(newDOM);
      }
      stats.updates++;
      return newDOM;
    }
    return oldDOM;
  }

  // Case 4: Element type changed (e.g., div -> span)
  // React's heuristic: Different types = completely different trees
  // Don't try to find similarities, just replace the whole subtree
  if (prevElement.type !== nextElement.type) {
    const newDOM = createDOMNode(nextElement);
    if (oldDOM) {
      container.replaceChild(newDOM, oldDOM);
    } else {
      container.appendChild(newDOM);
    }
    stats.creates++;
    stats.deletes++;
    return newDOM;
  }

  // Case 5: Same element type, update props and children
  const domNode = oldDOM as HTMLElement;

  // Update props (only what changed)
  updateProps(domNode, prevElement.props, nextElement.props);
  stats.updates++;

  // Reconcile children
  reconcileChildren(
    prevElement.children,
    nextElement.children,
    domNode
  );

  return domNode;
}

/**
 * Create a DOM node from a virtual element
 */
function createDOMNode(element: VElement | string): DOMNode {
  if (typeof element === 'string') {
    return document.createTextNode(element);
  }

  const domNode = document.createElement(element.type);

  // Set props
  Object.entries(element.props).forEach(([name, value]) => {
    setProp(domNode, name, value);
  });

  // Create children
  element.children.forEach((child) => {
    const childDOM = createDOMNode(child);
    domNode.appendChild(childDOM);
  });

  return domNode;
}

/**
 * Update props on a DOM node
 *
 * Strategy: Remove old props, add/update new props
 */
function updateProps(
  domNode: HTMLElement,
  prevProps: Record<string, any>,
  nextProps: Record<string, any>
): void {
  // Remove old props
  Object.keys(prevProps).forEach((name) => {
    if (!(name in nextProps)) {
      removeProp(domNode, name);
    }
  });

  // Add/update new props
  Object.entries(nextProps).forEach(([name, value]) => {
    if (prevProps[name] !== value) {
      setProp(domNode, name, value);
    }
  });
}

/**
 * Set a single prop on a DOM node
 */
function setProp(domNode: HTMLElement, name: string, value: any): void {
  // Handle special cases
  if (name === 'className') {
    domNode.className = value;
  } else if (name === 'style' && typeof value === 'object') {
    Object.assign(domNode.style, value);
  } else if (name.startsWith('on')) {
    // Event handler (e.g., onClick)
    const eventName = name.toLowerCase().substring(2);
    domNode.addEventListener(eventName, value);
  } else if (name === 'children') {
    // Skip - handled separately
  } else {
    // Regular attribute
    domNode.setAttribute(name, value);
  }
}

/**
 * Remove a prop from a DOM node
 */
function removeProp(domNode: HTMLElement, name: string): void {
  if (name === 'className') {
    domNode.className = '';
  } else if (name === 'style') {
    domNode.removeAttribute('style');
  } else if (name.startsWith('on')) {
    const eventName = name.toLowerCase().substring(2);
    // Note: This is simplified. Real implementation would track listeners.
    domNode.removeAttribute(name);
  } else if (name !== 'children') {
    domNode.removeAttribute(name);
  }
}

/**
 * Reconcile children - the heart of the algorithm
 *
 * Strategy: Use keys to match elements across renders
 *
 * Why keys matter:
 * Without keys, React matches by index. If you insert at the beginning,
 * React thinks every item changed!
 *
 * With keys, React knows item identities and can reuse DOM nodes.
 */
function reconcileChildren(
  prevChildren: (VElement | string)[],
  nextChildren: (VElement | string)[],
  parentDOM: HTMLElement
): void {
  // Build map of previous children by key
  const prevChildrenMap = new Map<string, {
    element: VElement | string;
    domNode: DOMNode;
    index: number;
  }>();

  prevChildren.forEach((child, index) => {
    const key = getKey(child, index);
    const domNode = parentDOM.childNodes[index] as DOMNode;
    prevChildrenMap.set(key, { element: child, domNode, index });
  });

  // Track which prev children were matched
  const matched = new Set<string>();

  // Reconcile next children
  nextChildren.forEach((nextChild, nextIndex) => {
    const key = getKey(nextChild, nextIndex);
    const prevChild = prevChildrenMap.get(key);

    if (prevChild) {
      // Key exists - reconcile and possibly reorder
      matched.add(key);

      const newDOM = reconcile(
        prevChild.element,
        nextChild,
        parentDOM,
        prevChild.domNode
      );

      // Handle reordering
      const currentDOM = parentDOM.childNodes[nextIndex];
      if (newDOM !== currentDOM) {
        // Insert at correct position
        parentDOM.insertBefore(newDOM!, parentDOM.childNodes[nextIndex] || null);
      }
    } else {
      // New key - create and insert
      const newDOM = createDOMNode(nextChild);
      const refNode = parentDOM.childNodes[nextIndex] || null;
      parentDOM.insertBefore(newDOM, refNode);
      stats.creates++;
    }
  });

  // Remove unmatched prev children
  prevChildrenMap.forEach((prevChild, key) => {
    if (!matched.has(key)) {
      parentDOM.removeChild(prevChild.domNode);
      stats.deletes++;
    }
  });
}

/**
 * Get key from element
 *
 * If element has explicit key, use it.
 * Otherwise, use index-based key (not ideal for reordering!)
 */
function getKey(element: VElement | string, index: number): string {
  if (typeof element === 'string') {
    return `text-${index}`;
  }
  return element.key ?? `index-${index}`;
}

/**
 * Performance Analysis
 *
 * Time Complexity: O(n) where n is number of elements
 * - Single pass through prev and next children
 * - Map lookups are O(1)
 * - No nested loops
 *
 * Space Complexity: O(n) for the prevChildrenMap
 *
 * DOM Operations:
 * - Best case: 0 (if nothing changed)
 * - Worst case: O(n) creates + O(n) deletes
 *
 * Comparison to naive approach (O(n³)):
 * - Naive: Compare every prev element to every next element
 * - Find minimum edit distance (dynamic programming)
 * - Time: O(n³), Space: O(n²)
 *
 * React's optimization:
 * - Trade accuracy for speed
 * - Assume different types = different trees (may recreate unnecessarily)
 * - Assume keys identify elements (relies on developer)
 * - Result: O(n) algorithm that works great in practice
 */

/**
 * Tradeoffs and Limitations
 *
 * 1. Type changes are expensive
 *    - Changing <div> to <span> recreates entire subtree
 *    - Even if children are identical
 *    - Tradeoff: Simplicity vs optimality
 *
 * 2. Keys are crucial for lists
 *    - Without keys, insertions cause many updates
 *    - With keys, insertions are O(1)
 *    - Tradeoff: Developer burden vs performance
 *
 * 3. No look-ahead
 *    - Only compares same positions in tree
 *    - Can't detect components moving between levels
 *    - Tradeoff: Simplicity vs flexibility
 *
 * 4. Synchronous
 *    - This implementation blocks until complete
 *    - Real React uses concurrent rendering
 *    - Tradeoff: Simplicity vs responsiveness
 */

/**
 * Real-World Patterns
 *
 * 1. Keep element types stable
 *    ❌ condition ? <SpecialDiv /> : <NormalDiv />
 *    ✅ <Div isSpecial={condition} />
 *
 * 2. Use stable keys for lists
 *    ❌ items.map((item, i) => <Item key={i} {...item} />)
 *    ✅ items.map(item => <Item key={item.id} {...item} />)
 *
 * 3. Avoid inline objects/arrays as props
 *    ❌ <Component style={{ margin: 10 }} />  // New object every render
 *    ✅ const STYLE = { margin: 10 }; <Component style={STYLE} />
 *
 * 4. Memoize expensive components
 *    ✅ const MemoizedItem = React.memo(Item);
 */
