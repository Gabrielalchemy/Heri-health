import "./globals.css";

export const metadata = {
  title: "Heri Health | Safety-first health intake",
  description: "Calm, structured health intake support for patients and clinicians",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
