export const metadata = { title: "College Compass", description: "Compare colleges, track notes, and get live updates." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", background: "#0b1020", color: "#e8ecf1", margin: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>🎓 College Compass</h1>
            <nav style={{ fontSize: 14, opacity: .9 }}>MVP • Local-first</nav>
          </header>
          {children}
          <footer style={{ marginTop: 40, fontSize: 12, opacity: .7 }}>
            <p>Local prototype. Data you enter stays in your browser (localStorage). API calls run server-side when deployed.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
