import { useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const contactInfo = [
  {
    icon: Phone,
    title: 'Phone',
    value: '+91 95348 95725',
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

export default function ContactPage() {
  useEffect(() => {
    // Inject the official LeadPe widget script
    const script = document.createElement('script');
    script.textContent = `
async function submitLeadPeLead(){
  var n=document.getElementById('lp-name').value;
  var p=document.getElementById('lp-phone').value;
  var i=document.getElementById('lp-interest').value;
  if(!n||!p){alert('Please fill name and phone');return}
  if(p.replace(/\\D/g,'').length!==10){alert('Enter 10 digit number');return}
  var btn=document.querySelector('#leadpe-widget button');
  btn.textContent='Sending...';btn.disabled=true;
  try{
    var res=await fetch('https://vlmdctanuarrmngkrvng.supabase.co/rest/v1/leads',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbWRjdGFudWFycm1uZ2tydm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDc0NjQsImV4cCI6MjA4ODA4MzQ2NH0.W9MoPMjK9eWHq7lFqX54Cqe6ZlF7oR62OwJ76A_a7Q8','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbWRjdGFudWFycm1uZ2tydm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDc0NjQsImV4cCI6MjA4ODA4MzQ2NH0.W9MoPMjK9eWHq7lFqX54Cqe6ZlF7oR62OwJ76A_a7Q8','Prefer':'return=minimal'},
      body:JSON.stringify({business_id:'1dba39f7-2be6-4d63-8fa1-be6a33874bf3',customer_name:n,phone:p.replace(/\\D/g,''),message:i,source:'website',status:'new'})
    });
    if(res.ok){
      var w=document.getElementById('leadpe-widget');
      while(w.firstChild)w.removeChild(w.firstChild);
      var d=document.createElement('div');
      d.style.cssText='text-align:center;padding:40px 20px;background:#F0FFF4;border-radius:16px;border:2px solid #00C853';
      var e1=document.createElement('div');e1.style.fontSize='48px';e1.textContent='✅';d.appendChild(e1);
      var e2=document.createElement('h3');e2.style.color='#1A1A1A';e2.textContent='Request Received!';d.appendChild(e2);
      var e3=document.createElement('p');e3.style.color='#666';e3.textContent='We will call you back within 2 hours.';d.appendChild(e3);
      var e4=document.createElement('p');e4.style.cssText='color:#999;font-size:11px';e4.textContent='Powered by LeadPe 🌱';d.appendChild(e4);
      w.appendChild(d);
    }else{btn.textContent='Get Callback 📲';btn.disabled=false;alert('Error. Please try again.')}
  }catch(e){btn.textContent='Get Callback 📲';btn.disabled=false;alert('Error. Please try again.')}
}`;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

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

            {/* Official LeadPe Lead Capture Widget */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div
                id="leadpe-widget"
                dangerouslySetInnerHTML={{
                  __html: `<div style="background:#fff;border:2px solid #00C853;border-radius:16px;padding:24px;max-width:400px;margin:20px auto;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,200,83,0.15)">
    <h3 style="color:#1A1A1A;margin:0 0 8px;font-size:20px">Get Free Consultation 📞</h3>
    <p style="color:#666;margin:0 0 20px;font-size:14px">Leave your details. We'll call you back!</p>
    <input id="lp-name" type="text" placeholder="Your Name" style="width:100%;padding:12px 16px;border:1px solid #E0E0E0;border-radius:10px;font-size:16px;margin-bottom:12px;box-sizing:border-box;outline:none"/>
    <input id="lp-phone" type="tel" placeholder="WhatsApp Number" style="width:100%;padding:12px 16px;border:1px solid #E0E0E0;border-radius:10px;font-size:16px;margin-bottom:12px;box-sizing:border-box;outline:none"/>
    <input id="lp-interest" type="text" placeholder="What are you looking for?" style="width:100%;padding:12px 16px;border:1px solid #E0E0E0;border-radius:10px;font-size:16px;margin-bottom:16px;box-sizing:border-box;outline:none"/>
    <button onclick="submitLeadPeLead()" style="width:100%;background:#00C853;color:white;border:none;border-radius:10px;padding:14px;font-size:16px;font-weight:bold;cursor:pointer">Get Callback 📲</button>
    <p style="text-align:center;margin:12px 0 0;font-size:11px;color:#999">Powered by LeadPe 🌱</p>
  </div>`
                }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Google Maps Embed */}
      <section className="bg-background pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">Find Us on the Map</h2>
          <div className="rounded-xl overflow-hidden border border-border aspect-video md:aspect-[21/9]">
            <iframe
              title="Shiva Study Centre Location – Krishna Chowk, Desari, Vaishali, Bihar"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3594.0!2d85.45!3d25.68!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sDesari%2C+Vaishali%2C+Bihar!5e0!3m2!1sen!2sin!4v1700000000000"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
