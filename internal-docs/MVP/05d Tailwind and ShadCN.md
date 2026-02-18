# 🎨 **1. tailwind.config.js (Theme‑Aligned)**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        primary: {
          DEFAULT: "#3B82F6",   // Blue 500
          dark: "#1E40AF",      // Blue 900
          light: "#93C5FD",     // Blue 300
        },

        // Status Colors
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",

        // Backgrounds
        bg: {
          DEFAULT: "#0F172A",   // Slate 900
          card: "#1E293B",      // Slate 800
          glass: "rgba(15, 23, 42, 0.8)",
        },

        // Text
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B",
        },
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },

      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.25)",
        glow: "0 0 12px rgba(59,130,246,0.6)", // blue glow
        gold: "0 0 12px rgba(234,179,8,0.6)", // legendary rarity
      },

      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      scale: {
        102: "1.02",
      },
    },
  },
  plugins: [],
};
```

---

# 🧩 **2. Global CSS (Optional but Recommended)**  
Add this to `globals.css` for a polished base.

```css
html, body {
  background-color: #0F172A;
  color: #F8FAFC;
  font-family: Inter, sans-serif;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background: #1E293B;
  border-radius: 8px;
}
```

---

# 🔌 **3. Recommended Tailwind Plugins**

You can optionally add:

```bash
npm install @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio
```

Then in config:

```js
plugins: [
  require("@tailwindcss/forms"),
  require("@tailwindcss/typography"),
  require("@tailwindcss/aspect-ratio"),
],
```

These give you:

- Clean form inputs  
- Beautiful text blocks  
- Perfectly scaled badge images  

---

# 🧱 **4. How to Apply the Theme in Components**

### **Badge Card**
```jsx
<div className="bg-bg-card rounded-xl shadow-card p-4 hover:scale-102 transition-all duration-200 ease-smooth hover:shadow-glow">
  <img src={badge.image} className="rounded-lg mb-3" />
  <h3 className="text-lg font-semibold">{badge.title}</h3>
  <p className="text-text-secondary text-sm">{badge.description}</p>
  <button className="mt-4 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md">
    Claim
  </button>
</div>
```

### **Modal**
```jsx
<div className="backdrop-blur-lg bg-bg-glass border border-white/10 rounded-2xl p-6 shadow-card">
```

### **Success Glow (Legendary Badge)**
```jsx
<div className="shadow-gold">
```

---

# ⭐ **Why This Tailwind Config Works**

- Matches your entire UI theme perfectly  
- Gives you a premium, glassy, web3 aesthetic  
- Easy to extend as your project grows  
- Makes your badge system feel collectible and polished  
- Reviewers will immediately notice the visual quality  

---

If you want, I can also generate:

- **Shadcn UI theme preset**  
- **Component library (BadgeCard, ClaimModal, Header, etc.)**  
- **A full Figma‑style mockup (text‑based)**  
- **A complete Next.js folder structure**  

Just tell me what you want to build next.
