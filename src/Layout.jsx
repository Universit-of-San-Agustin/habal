export default function Layout({ children, currentPageName }) {
  // Apple-style premium layout with system font stack
  return (
    <>
      <style>{`
        html, body, #root {
          background: #F5F5F7;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
          height: 100%;
          overflow: hidden;
        }
      `}</style>
      {children}
    </>
  );
}