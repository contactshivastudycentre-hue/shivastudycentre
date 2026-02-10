import { useEffect } from 'react';

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "Shiva Study Centre",
  "alternateName": ["Shiva Study Center", "SSC Desari"],
  "url": "https://shivastudycentre.lovable.app",
  "logo": "https://shivastudycentre.lovable.app/pwa-icon-512.svg",
  "description": "Shiva Study Centre is a trusted coaching institute in Desari, Vaishali, Bihar offering quality education for Class 6–12 students.",
  "telephone": "+919534895725",
  "email": "contact.shivastudycentre@gmail.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Krishna Chowk, Desari",
    "addressLocality": "Vaishali",
    "addressRegion": "Bihar",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "25.68",
    "longitude": "85.45"
  },
  "areaServed": {
    "@type": "Place",
    "name": "Desari, Vaishali, Bihar"
  },
  "sameAs": [],
  "founder": {
    "@type": "Person",
    "name": "Mr. Sanjay Singhania",
    "jobTitle": "Chairman"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "opens": "09:00",
    "closes": "18:00"
  }
};

export function JsonLd() {
  useEffect(() => {
    const existing = document.getElementById('jsonld-schema');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'jsonld-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(SCHEMA);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
