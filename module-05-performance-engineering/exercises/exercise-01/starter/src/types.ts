export interface VirtualizerOptions {
  count: number
  estimatedItemHeight: number
  getItemHeight: (index: number) => number
  scrollTop: number
  viewportHeight: number
  overscan: number
}

export interface VirtualItem {
  index: number
  start: number
  height: number
}

export interface VirtualizerResult {
  virtualItems: VirtualItem[]
  totalHeight: number
  startIndex: number
  endIndex: number
}
