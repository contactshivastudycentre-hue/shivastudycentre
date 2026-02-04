import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClassSelect } from '@/components/ClassSelect';
import emailjs from '@emailjs/browser';

const contactInfo = [
  {
    icon: Phone,
    title: 'Phone',
    value: '+91 98765 43210',
    description: 'Mon-Sat, 9am-6pm',
  },
  {
    icon: Mail,
    title: 'Email',
    value: 'contact.shivastudycentre@gmail.com',
    description: 'We reply within 24 hours',
  },
  {
    icon: MapPin,
    title: 'Address',
    value: 'Krishna Chowk, Desari',
    description: 'Vaishali, Bihar',
  },
  {
    icon: Clock,
    title: 'Working Hours',
    value: 'Mon - Sat: 9am - 6pm',
    description: 'Sunday: Closed',
  },
];

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_ssc';
const EMAILJS_TEMPLATE_ID = 'template_813jm07';
const EMAILJS_PUBLIC_KEY = 'rgW5TjWx7RqdCNoxW';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedClass, setSelectedClass] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};
    
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const message = formData.get('message') as string;

    if (!name || name.trim().length < 2) {
      newErrors.name = 'Please enter your full name';
    }

    if (!phone || !/^\d{10}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!selectedClass) {
      newErrors.class = 'Please select a class';
    }

    if (!message || message.trim().length < 10) {
      newErrors.message = 'Please enter a message (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    if (!validateForm(formData)) {
      return;
    }

    setIsSubmitting(true);
    setFormStatus('idle');
    setErrors({});

    try {
      const templateParams = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        class: selectedClass,
        message: formData.get('message') as string,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      setFormStatus('success');
      formRef.current?.reset();
      setSelectedClass('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setFormStatus('idle');
      }, 5000);
    } catch (error) {
      console.error('EmailJS Error:', error);
      setFormStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-primary py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Contact Us</span>
            </motion.div>
            
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white">
              Get in Touch
            </h1>
            <p className="text-lg md:text-xl text-white/80">
              Have questions about admissions or our courses? We'd love to hear from you.
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
                Contact Information
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contactInfo.map((info, index) => (
                  <motion.div 
                    key={info.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card p-5 rounded-xl border border-border"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <info.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{info.title}</h3>
                    <p className="text-foreground text-sm">{info.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card p-6 md:p-8 rounded-xl border border-border"
            >
              <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-6">
                Send us a Message
              </h2>

              {/* Status Messages */}
              <AnimatePresence>
                {formStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Thank you for contacting Shiva Study Center!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        We have received your enquiry and will contact you shortly.
                      </p>
                    </div>
                  </motion.div>
                )}

                {formStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Something went wrong</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Please try again or contact us directly via phone.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your full name"
                      className={`h-11 rounded-lg ${errors.name ? 'border-destructive' : ''}`}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className={`h-11 rounded-lg ${errors.phone ? 'border-destructive' : ''}`}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Class</Label>
                  <ClassSelect
                    value={selectedClass}
                    onChange={setSelectedClass}
                    placeholder="Select class for enquiry"
                  />
                  {errors.class && (
                    <p className="text-xs text-destructive">{errors.class}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Your message or enquiry..."
                    rows={4}
                    className={`resize-none rounded-lg ${errors.message ? 'border-destructive' : ''}`}
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive">{errors.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base rounded-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Send Message
                    </span>
                  )}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
