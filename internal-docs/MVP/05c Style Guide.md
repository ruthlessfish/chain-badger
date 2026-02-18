# 🎨 **UI Theme & Style Guide**

## 🟦 **1. Brand Personality**
Your project should feel:

- **Clean** — minimal, uncluttered, easy to navigate  
- **Trustworthy** — subtle gradients, soft shadows, clear hierarchy  
- **Playful but professional** — badges feel fun, but the UI feels polished  
- **Web3‑native** — crisp edges, glassy surfaces, subtle neon accents  

Think: *“modern dashboard meets collectible card game.”*

---

# 🎨 **2. Color Palette**

### **Primary Colors**
| Purpose | Color | Notes |
|--------|--------|--------|
| Primary | `#3B82F6` (Blue 500) | Clean, trustworthy, web3‑friendly |
| Primary Dark | `#1E40AF` | Buttons, headers |
| Primary Light | `#93C5FD` | Hover states, accents |

### **Secondary Colors**
| Purpose | Color | Notes |
|--------|--------|--------|
| Success | `#10B981` | Mint success, confirmations |
| Warning | `#F59E0B` | Rare badge accents |
| Error | `#EF4444` | Signature or tx errors |

### **Background**
| Purpose | Color |
|--------|--------|
| Main Background | `#0F172A` (Slate 900) |
| Card Background | `#1E293B` (Slate 800) |
| Modal Background | `rgba(15, 23, 42, 0.8)` (glass) |

### **Text**
| Purpose | Color |
|--------|--------|
| Primary Text | `#F8FAFC` |
| Secondary Text | `#94A3B8` |
| Muted Text | `#64748B` |

---

# ✨ **3. Typography**

### **Font Family**
- **Inter** (recommended)  
- Alternatives: **Satoshi**, **Manrope**, **Space Grotesk**

### **Font Weights**
- 600 — headings  
- 500 — subheadings  
- 400 — body text  
- 300 — muted text  

### **Type Scale**
| Element | Size |
|--------|-------|
| H1 | 32px |
| H2 | 24px |
| H3 | 20px |
| Body | 16px |
| Small | 14px |

---

# 🧱 **4. Component Style Rules**

## **Buttons**
- Rounded‑md  
- Medium padding  
- Bold text  
- Subtle glow on hover  

**Primary Button**
- Background: `#3B82F6`  
- Hover: `#1E40AF`  
- Shadow: soft blue glow  

**Secondary Button**
- Border: `1px solid #3B82F6`  
- Text: primary blue  
- Hover: slight blue tint  

---

## **Cards (Badge Cards)**
- Background: `#1E293B`  
- Border: `1px solid rgba(255,255,255,0.05)`  
- Rounded‑xl  
- Soft shadow  
- Hover:  
  - scale: `1.02`  
  - shadow intensifies  
  - slight border glow  

**Badge Image Style**
- Slight inner shadow  
- Rounded corners  
- Subtle gradient overlay  

---

## **Modals**
- Glassmorphism  
- Backdrop blur: `blur(12px)`  
- Border: `1px solid rgba(255,255,255,0.1)`  
- Rounded‑2xl  
- Drop shadow: soft, diffused  

---

# 🌀 **5. Motion & Interaction**

### **Micro‑interactions**
- Buttons: 150ms ease‑out  
- Cards: 200ms hover scale  
- Claim progress: smooth fade transitions  
- Success animation:  
  - badge pops in  
  - confetti burst (optional)  

### **Easing**
Use:
- `cubic-bezier(0.4, 0, 0.2, 1)` (material standard)  
- or `ease-out` for hover states  

---

# 🧩 **6. Iconography**

Use a consistent icon set:
- **Lucide Icons** (recommended)  
- Alternatives: Heroicons, Phosphor  

Icons should be:
- Thin or regular weight  
- 20–24px  
- Minimal, geometric  

---

# 🏅 **7. Badge Visual Style**

Badges should feel collectible:

- Bold outlines  
- Vibrant colors  
- Subtle gradients  
- Category‑based color coding  
- Rarity glows:  
  - Common: none  
  - Rare: soft blue glow  
  - Epic: purple glow  
  - Legendary: gold glow  

---

# 🧭 **8. Layout & Spacing**

### **Spacing Scale**
- 4px  
- 8px  
- 12px  
- 16px  
- 24px  
- 32px  

### **Grid**
- 3‑column badge grid on desktop  
- 2‑column on tablet  
- 1‑column on mobile  

### **Container Width**
- Max width: 1200px  
- Centered with generous padding  

---

# ⭐ **9. Overall Aesthetic Summary**

Your dApp should feel like:

**“A sleek, futuristic badge collection dashboard with subtle neon accents and a premium, glassy interface.”**

This theme pairs perfectly with your badge system and gives your AU reviewers a strong sense of polish and intention.
