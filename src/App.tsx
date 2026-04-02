import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { useRenderTracker } from './render-tracker'
import { RenderTrackerPanel } from './render-tracker-ui'

function App() {
  const [count, setCount] = useState(0)
  const [text, setText] = useState('Hello World')
  const [isActive, setIsActive] = useState(false)
  const [items, setItems] = useState(['Item 1', 'Item 2'])
  const [bgColor, setBgColor] = useState('white')
  
  // Track reference changes (new object each render)
  const dynamicData = { timestamp: Date.now(), text }
  
  useRenderTracker('App', { count, text, isActive, items, bgColor, dynamicData })

  const addItem = () => {
    setItems(prev => [...prev, `Item ${prev.length + 1}`])
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      

        {/* Test UI Controls */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: bgColor,
          transition: 'background-color 0.3s'
        }}>
          <h3>Render Tracker Test Controls</h3>
          
          {/* Counter */}
          <div style={{ marginBottom: '15px' }}>
            <button
              className="counter"
              onClick={() => setCount((count) => count + 1)}
            >
              Count is {count}
            </button>
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>
              (Triggers state change)
            </span>
          </div>

          {/* Text Input */}
          <div style={{ marginBottom: '15px' }}>
            <label>
              Type something: 
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  marginLeft: '8px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
                placeholder="Edit text..."
              />
            </label>
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>
              (Triggers re-render on each keystroke)
            </span>
          </div>

          {/* Toggle */}
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => setIsActive(!isActive)}
              style={{
                padding: '6px 12px',
                backgroundColor: isActive ? '#4CAF50' : '#f1f1f1',
                color: isActive ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isActive ? '✓ Active' : '○ Inactive'}
            </button>
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>
              (Toggle boolean state)
            </span>
          </div>

          {/* Color Picker */}
          <div style={{ marginBottom: '15px' }}>
            <label>
              Background color:
              <select
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{
                  marginLeft: '8px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              >
                <option value="white">White</option>
                <option value="#e8f5e9">Light Green</option>
                <option value="#e3f2fd">Light Blue</option>
                <option value="#fff3e0">Light Orange</option>
                <option value="#fce4ec">Light Pink</option>
              </select>
            </label>
          </div>

          {/* Item List */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ marginBottom: '8px' }}>
              <button
                onClick={addItem}
                style={{
                  padding: '6px 12px',
                  marginRight: '8px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                + Add Item
              </button>
              <span style={{ fontSize: '14px' }}>
                ({items.length} items)
              </span>
            </div>
            <ul style={{
              listStyle: 'none',
              padding: '0',
              margin: '8px 0',
              fontSize: '14px'
            }}>
              {items.map((item, idx) => (
                <li key={idx} style={{
                  padding: '4px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{item}</span>
                  <button
                    onClick={() => removeItem(idx)}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
            marginTop: '10px',
            fontFamily: 'monospace'
          }}>
            <strong>Current State:</strong><br/>
            count: {count} | text length: {text.length} | isActive: {isActive} | items: {items.length}
            <br/>
            <strong style={{ color: '#ff6b6b' }}>⚠ dynamicData: New object each render (tests reference-change tracking)</strong>
          </div>
        </div>

    
        <RenderTrackerPanel className="app-render-tracker" />
      
    </>
  )
}

export default App
