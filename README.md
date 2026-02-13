# 3D Stability Checker

A web application designed to verify the physical stability of 3D models (STL files) before printing. It helps determine if an object will stand upright on its own or tip over depending on its geometry and center of mass.

## 🎯 What it does

This tool solves a common problem in 3D printing and design: knowing whether a model is balanced. instead of printing a model only to find out it falls over, you can check it here first.

**It returns:**
- A **Visual 3D Preview** of your model.
- A **Stability Verdict**:
  - ✅ **Stable**: The object's center of mass projects within its base of support.
  - ⚠️ **Unstable**: The object's center of mass is outside its base of support, meaning it will likely tip over.

## 🚀 Features

- **Drag and Drop**: Easily upload `.stl` files.
- **Real-time 3D Rendering**: View and rotate your model in the browser.
- **Physics Calculation**: Automatically computes volume, center of mass, and contact points.
- **Instant Feedback**: Clear UI indicators for stable vs. unstable models.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 14 (App Router)
- **3D Graphics**: [Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI**: [Radix UI](https://www.radix-ui.com/) & [Shadcn/ui](https://ui.shadcn.com/)

## 📝 License

MIT License