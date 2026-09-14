import "./globals.css";

export const metadata = {
  title: "Lasoph",
  description: "Calm, structured health intake support",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
