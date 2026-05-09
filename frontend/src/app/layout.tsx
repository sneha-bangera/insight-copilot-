import type { Metadata } from "next";
import { Playwrite_AU_QLD, Montserrat } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const playwriteAUQLD = Playwrite_AU_QLD({
  variable: "--font-heading",
  // subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Insight Copilot',
  description: 'Ask business questions in plain English. Get SQL-powered answers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playwriteAUQLD.variable} ${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

