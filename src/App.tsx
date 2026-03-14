import { useState } from "react";
import { generatePalette } from "./utils/generatePalette";

function App() {
  const [baseColor, setBaseColor] = useState("#3b82f6");
  const [scheme, setScheme] = useState("analogous");
  const [count, setCount] = useState(5);
  const palette = generatePalette(baseColor, scheme, count);

  return (
    <div style={{ padding: 40 }}>
      <h1> Pal-ette: Color Palette Generator</h1>
      <select value={scheme} onChange={(e) => setScheme(e.target.value)}>
        <option value="analogous">Analogous</option>
        <option value="complementary">Complementary</option>
        <option value="triadic">Triadic</option>
      </select>

      <input
        type="color"
        value={baseColor}
        onChange={(e) => setBaseColor(e.target.value)}
      />

      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}
      >
        <label>Colors:</label>
        <input
          type="number"
          min={1}
          max={9}
          value={count}
          onChange={(e) =>
            setCount(Math.min(9, Math.max(1, Number(e.target.value))))
          }
          style={{ width: 50 }}
        />
        <button
          onClick={() => setCount((c) => Math.min(9, c + 1))}
          disabled={count >= 9}
        >
          + Add Color
        </button>
        <button
          style={{ marginLeft: 20 }}
          onClick={() => setCount((c) => Math.min(9, c - 1))}
          disabled={count <= 1}
        >
          - Remove Color
        </button>
      </div>
      <div style={{ display: "flex", marginTop: 20 }}>
        {palette.map((color, index) => (
          <div
            key={index}
            onClick={() => navigator.clipboard.writeText(color)}
            style={{
              background: color,
              width: 120,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
            }}
          >
            {color}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
