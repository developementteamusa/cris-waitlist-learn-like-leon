import './globals.css';
export const metadata = {
  metadataBase: new URL('https://waitlist.learnlikeleon.com'),
  title: 'Cris | Faster Hiring. Safer Teams.',
  description: 'Join the Cris early-access waitlist. Streamline candidate onboarding, identity-document verification, and background-check readiness in one secure workflow.',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: 'any' }], apple: '/apple-icon.png' },
  openGraph: { title:'Cris — Real-Time Background Check SaaS', description:'Faster hiring. Safer teams. Brighter tomorrow.', images:['/images/cris-product.png'] },
};
export default function RootLayout({children}) { return <html lang="en"><body>{children}</body></html>; }
