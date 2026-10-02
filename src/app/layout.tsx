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


export const metadata: Metadata = {
  title: "Cynthia's Wedding Plans",
  description: "A voice wedding planner made by Kane for Cynthia. Speak your plans; an open-weight model keeps the checklist, the budget and the countdown, and ElevenLabs gives it a warm voice.",
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
