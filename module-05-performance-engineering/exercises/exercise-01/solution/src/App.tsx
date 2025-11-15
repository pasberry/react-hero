import { useState } from 'react'
import { VirtualList } from './VirtualList'
import { VariableList } from './VariableList'

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  title: `Item ${i}`,
  description: `Description for item ${i}`,
}))

function App() {
  const [mode, setMode] = useState<'fixed' | 'variable'>('fixed')
  const [scrollTop, setScrollTop] = useState(0)

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Virtual List Demo</h1>
      <p style={{ color: '#666' }}>
        Efficiently rendering <strong>10,000 items</strong> with virtualization
      </p>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setMode('fixed')}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'fixed' ? '#007AFF' : '#f0f0f0',
            color: mode === 'fixed' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Fixed Height
        </button>
        <button
          onClick={() => setMode('variable')}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'variable' ? '#007AFF' : '#f0f0f0',
            color: mode === 'variable' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Variable Height
        </button>
      </div>

      <div style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
        Scroll position: {scrollTop}px
      </div>

      <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
        {mode === 'fixed' ? (
          <VirtualList
            items={items}
            height={600}
            itemHeight={60}
            onScroll={setScrollTop}
            renderItem={(item) => (
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #eee',
                  backgroundColor: item.id % 2 === 0 ? 'white' : '#fafafa',
                }}
              >
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  {item.description}
                </p>
              </div>
            )}
          />
        ) : (
          <VariableList
            items={items}
            height={600}
            estimatedItemHeight={60}
            renderItem={(item) => (
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #eee',
                  backgroundColor: item.id % 2 === 0 ? 'white' : '#fafafa',
                }}
              >
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  {item.description}
                  {item.id % 3 === 0 && (
                    <>
                      <br />
                      Extra content to demonstrate variable heights. This item is
                      taller than others.
                    </>
                  )}
                </p>
              </div>
            )}
          />
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Performance Metrics</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Total items: 10,000</li>
          <li>Rendered items: ~10 (only visible ones)</li>
          <li>Target: 60 FPS scrolling</li>
          <li>Binary search: O(log n) visible range lookup</li>
        </ul>
      </div>
    </div>
  )
}

export default App
