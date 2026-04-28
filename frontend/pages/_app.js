import '../styles/globals.css';
import '../styles/admin-mobile.css';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isResponder = router.pathname === '/responder';

  useEffect(() => {
    // Register appropriate service worker for PWA
    if ('serviceWorker' in navigator) {
      const swPath = isResponder ? '/responder-sw.js' : '/sw.js';
      navigator.serviceWorker
        .register(swPath)
        .then((registration) => console.log('Service Worker registered:', swPath))
        .catch((error) => console.log('Service Worker registration failed:', error));
    }
  }, [isResponder]);

  return (
    <>
      <Head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content={isResponder ? "Emergency Responder" : "Emergency Response"} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content={isResponder ? "black-translucent" : "default"} />
        <meta name="apple-mobile-web-app-title" content={isResponder ? "Responder" : "Emergency"} />
        <meta name="description" content={isResponder ? "Ghana Emergency Response System - Responder App" : "Ghana Emergency Response Network - Report emergencies instantly"} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#667eea" />
        
        {/* Viewport for mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        
        {/* PWA Manifest - Conditional based on route */}
        <link rel="manifest" href={isResponder ? "/responder-manifest.json" : "/manifest.json"} />
        
        {/* Icons - Conditional based on route */}
        <link rel="icon" type="image/png" sizes="192x192" href={isResponder ? "/responder-icon-192.png" : "/icon-192.png"} />
        <link rel="icon" type="image/png" sizes="512x512" href={isResponder ? "/responder-icon-512.png" : "/icon-512.png"} />
        <link rel="apple-touch-icon" href={isResponder ? "/responder-icon-192.png" : "/icon-192.png"} />
        
        {/* Fonts */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Two+Tone" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
