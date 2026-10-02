import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/great-vibes/400.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "./globals.css";
import Backdrop from "@/components/Backdrop";


const title = "Cynthia's Wedding Plans";
const description = "A voice wedding planner made by Kane for Cynthia. Speak your plans, and it keeps the checklist, the budget and the countdown.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cynthias-wedding.vercel.app"),
  title,
  description,
  applicationName: title,
  openGraph: { type: "website", url: "/", siteName: title, title, description, locale: "en_NG" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#f5f1eb", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Backdrop />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
