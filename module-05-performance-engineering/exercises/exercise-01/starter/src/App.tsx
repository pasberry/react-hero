import { VirtualList } from './VirtualList'

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  title: `Item ${i}`,
  description: `Description for item ${i}`,
}))

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Virtual List Exercise</h1>
      <p>Implement the VirtualList component to efficiently render 10,000 items</p>

      {/* TODO: Replace with working VirtualList */}
      <div style={{ border: '1px solid #ccc', marginTop: '20px' }}>
        <VirtualList
          items={items}
          height={600}
          itemHeight={60}
          renderItem={(item) => (
            <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          )}
        />
      </div>
    </div>
  )
}

export default App
