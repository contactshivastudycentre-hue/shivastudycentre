import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
}

const defaults: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Shiva Study Centre | Official Website | Desari, Vaishali, Bihar',
    description: 'Official website of Shiva Study Centre, a trusted coaching institute in Desari, Vaishali, Bihar. Notes, tests, video lectures and expert guidance for Class 4–12.',
  },
  '/about': {
    title: 'About Shiva Study Centre | Coaching Institute in Desari, Vaishali',
    description: 'Learn about Shiva Study Centre – our mission, vision, leadership, and commitment to quality education in Desari, Vaishali, Bihar.',
  },
  '/contact': {
    title: 'Contact Shiva Study Centre | Desari, Vaishali, Bihar',
    description: 'Get in touch with Shiva Study Centre. Visit us at Krishna Chowk, Desari, Vaishali, Bihar or call +91 95348 95725.',
  },
};

export function SEOHead({ title, description }: SEOHeadProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = defaults[pathname];
    document.title = title || page?.title || 'Shiva Study Centre | Official Website | Desari, Vaishali, Bihar';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description || page?.description || '');
    }
  }, [pathname, title, description]);

  return null;
}
