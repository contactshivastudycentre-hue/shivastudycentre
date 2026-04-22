import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, FileText, Play, UserCircle, Shield, Target, BookOpen, ClipboardCheck, Trophy, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { SmallPWAButton } from '@/components/pwa/SmallPWAButton';
import ChallengeBanner from '@/components/ChallengeBanner';

const features = [
  {
    icon: ClipboardList,
    title: 'Online Tests',
    description: 'MCQ tests with timer, auto-scoring & instant results',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
  },
  {
    icon: FileText,
    title: 'Study Notes',
    description: 'Class-wise PDF notes organized by subject',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Play,
    title: 'Video Lectures',
    description: 'Expert video lessons you can watch anytime',
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
  },
  {
    icon: Target,
    title: 'Track Progress',
    description: 'See your scores, results & improvement over time',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
  },
];

export default function MobileAppLanding() {
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-cycle features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = features[activeFeature];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChallengeBanner />
      {/* Top Section - Logo & Brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-8 pb-4 px-6 text-center"
      >
        <div className="flex justify-center mb-3">
          <Logo size="lg" showText={false} />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Shiva Study Centre
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Desari, Vaishali, Bihar</p>
      </motion.div>

      {/* Feature Showcase - Auto-animated */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
        <div className="w-full max-w-sm">
          {/* Feature Card with Animation */}
          <div className="relative h-64 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -30 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <motion.div
                  className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${current.gradient} flex items-center justify-center mb-5 shadow-xl`}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <current.icon className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  {current.title}
                </h2>
                <p className="text-muted-foreground text-center text-base leading-relaxed">
                  {current.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-4 mb-8">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveFeature(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === activeFeature
                    ? 'w-8 h-2.5 bg-primary'
                    : 'w-2.5 h-2.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Login Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-6 pt-2 space-y-3"
      >
        <Link to="/student-login" className="block">
          <Button className="w-full h-14 text-base rounded-xl bg-primary hover:bg-primary/90">
            <UserCircle className="w-5 h-5 mr-2" />
            Student Login
          </Button>
        </Link>
        <div className="flex justify-center pt-1">
          <SmallPWAButton variant="landing" />
        </div>
        <div className="text-center pt-2">
          <Link to="/admin-login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Shield className="w-3 h-3" />
            Admin? Sign in here
          </Link>
        </div>
      </motion.div>

      {/* Why Choose Shiva Study Center */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="px-6 pt-6 pb-8"
      >
        <div className="text-center mb-4">
          <h2 className="text-lg font-display font-bold text-foreground">
            Why Choose Shiva Study Center
          </h2>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <ul className="space-y-3">
            {[
              { icon: BookOpen, title: 'Concept-Based Learning', desc: 'Strong focus on clear understanding, not rote learning' },
              { icon: ClipboardCheck, title: 'Weekly Tests & Practice', desc: 'Regular tests to improve performance and confidence' },
              { icon: Trophy, title: 'Competitive Environment', desc: 'Leaderboards and prize tests to motivate students' },
              { icon: Target, title: 'Result-Oriented Guidance', desc: 'Personal attention for better results' },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-center mt-5">
            <Link to="/student-login">
              <button
                className="inline-flex items-center justify-center gap-1.5 text-white transition-colors hover:opacity-90"
                style={{
                  height: '42px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: '#4F46E5',
                }}
              >
                <Sparkles className="w-4 h-4" />
                Start Learning
              </button>
            </Link>
          </div>
        </div>

        <p className="text-center mt-2.5" style={{ fontSize: '11px', color: '#9CA3AF' }}>
          Powered by LeadPe
        </p>
      </motion.section>
    </div>
  );
}
