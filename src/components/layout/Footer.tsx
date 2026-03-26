import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Mail, Phone, MapPin } from 'lucide-react';
const footerLinks = {
  quick: [{
    name: 'Home',
    path: '/'
  }, {
    name: 'About Us',
    path: '/about'
  }, {
    name: 'Contact',
    path: '/contact'
  }, {
    name: 'Student Login',
    path: '/student-login'
  }],
  legal: [{
    name: 'Terms & Conditions',
    path: '/terms'
  }, {
    name: 'Privacy Policy',
    path: '/terms'
  }]
};
export function Footer() {
  return <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Logo size="md" />
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Quality education with a focus on conceptual understanding and student success.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.quick.map(link => <li key={link.name}>
                  <Link to={link.path} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-bold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map(link => <li key={link.name}>
                  <Link to={link.path} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-foreground mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Krishna Chowk, Desari,<br />Vaishali, Bihar</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <span>+91 95348 95725 </span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>contact.shivastudycentre@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Shiva Study Center. All rights reserved.
          </p>
          <div className="flex gap-4 items-center text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            <span className="text-border">|</span>
            <a href="https://leadpe.in" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
               Powered by LEADPE
             </a>
          </div>
        </div>
      </div>
    </footer>;
}