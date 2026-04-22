import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ClipboardList, FileText, Play, Users, ArrowRight, Sparkles, GraduationCap, Target, Award, Zap, Shield, UserCircle, ExternalLink, Download } from 'lucide-react';
import swaritImage from '@/assets/swarit-roy.jpg';
import { SmallPWAButton } from '@/components/pwa/SmallPWAButton';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileAppLanding from '@/pages/MobileAppLanding';
import ChallengeBanner from '@/components/ChallengeBanner';

const fadeInUp = {
  initial: {
    opacity: 0,
    y: 30
  },
  animate: {
    opacity: 1,
    y: 0
  },
  transition: {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1]
  }
};
const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
const features = [{
  icon: ClipboardList,
  title: 'Online Tests',
  description: 'Take MCQ-based tests with timer and instant results',
  gradient: 'from-violet-500 to-purple-600'
}, {
  icon: FileText,
  title: 'Study Notes',
  description: 'Access comprehensive notes organized by subject and class',
  gradient: 'from-blue-500 to-cyan-500'
}, {
  icon: Play,
  title: 'Video Lectures',
  description: 'Watch expert video lessons anytime, anywhere',
  gradient: 'from-pink-500 to-rose-500'
}, {
  icon: Users,
  title: 'Personal Guidance',
  description: 'Get personalized attention and mentorship',
  gradient: 'from-amber-500 to-orange-500'
}];
const benefits = [{
  icon: GraduationCap,
  text: 'Expert faculty with years of experience'
}, {
  icon: FileText,
  text: 'Comprehensive study materials'
}, {
  icon: Target,
  text: 'Regular assessments and feedback'
}, {
  icon: Sparkles,
  text: 'Doubt clearing sessions'
}, {
  icon: Zap,
  text: 'Progress tracking dashboard'
}, {
  icon: Award,
  text: 'Flexible learning schedule'
}];
export default function LandingPage() {
  const isMobile = useIsMobile();

  // On mobile, show the animated app landing instead of full website
  if (isMobile) {
    return <MobileAppLanding />;
  }

  return <div className="overflow-hidden">
      <ChallengeBanner />
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center hero-gradient overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -20, 0]
        }} transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
          <motion.div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -40, 0],
          y: [0, 30, 0]
        }} transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/5 blur-3xl" animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360]
        }} transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-5 py-2.5 mb-8 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">Excellence in Education </span>
            </motion.div>

            <motion.h1 initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.2
           }} className="text-4xl sm:text-5xl md:text-7xl font-display font-extrabold mb-6 text-white leading-tight">
               <span className="sr-only">Shiva Study Centre – Official Coaching Institute in Desari, Vaishali, Bihar. </span>
               Shape Your Future with{' '}
               <span className="relative">
                 <span className="relative z-10">Quality Education</span>
                <motion.span className="absolute -bottom-2 left-0 right-0 h-3 bg-white/30 rounded-full -z-0" initial={{
                scaleX: 0
              }} animate={{
                scaleX: 1
              }} transition={{
                duration: 0.8,
                delay: 1
              }} />
              </span>
            </motion.h1>

            <motion.p initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.4
          }} className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join Shiva Study Center and unlock your potential with our comprehensive coaching program, expert faculty, and personalized learning approach.
            </motion.p>

            {/* Login Buttons */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.6
          }} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
              <Link to="/student-login">
                <Button size="lg" className="btn-hero text-lg px-8 h-14 rounded-xl group w-full sm:w-auto">
                  <UserCircle className="w-5 h-5 mr-2" />
                  Student Login
                  <motion.span className="ml-2" animate={{
                  x: [0, 4, 0]
                }} transition={{
                  duration: 1.5,
                  repeat: Infinity
                }}>
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </Button>
              </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mb-6">
              <Link to="/admin-login" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors underline-offset-4 hover:underline">
                <Shield className="w-3.5 h-3.5" />
                Admin? Sign in here
              </Link>
            </motion.div>

            {/* Download App Button - Mobile Only */}
            <motion.div initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} transition={{
              duration: 0.8,
              delay: 0.7
            }} className="flex justify-center mb-6">
              <SmallPWAButton variant="landing" />
            </motion.div>

            <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            duration: 0.8,
            delay: 0.8
          }}>
              <Link to="/about" className="text-white/70 hover:text-white transition-colors underline underline-offset-4">
                Learn more about us
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background relative">
        <div className="container mx-auto px-4">
          <motion.div initial="initial" whileInView="animate" viewport={{
          once: true,
          margin: "-100px"
        }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeInUp} className="inline-block text-sm font-semibold text-primary mb-4 tracking-wider uppercase">
              What We Offer
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
              Everything You Need to{' '}
              <span className="gradient-text">Succeed</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools and resources you need for academic excellence.
            </motion.p>
          </motion.div>

          <motion.div initial="initial" whileInView="animate" viewport={{
          once: true,
          margin: "-50px"
        }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => <motion.div key={feature.title} variants={fadeInUp} whileHover={{
            y: -8,
            transition: {
              duration: 0.3
            }
          }} className="feature-card group cursor-pointer">
                <motion.div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`} whileHover={{
              rotate: [0, -5, 5, 0]
            }} transition={{
              duration: 0.5
            }}>
                  <feature.icon className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-xl font-display font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>)}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-accent/30 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{
            opacity: 0,
            x: -50
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8
          }}>
              <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wider uppercase">
                Why Choose Us
              </span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
                Why Choose{' '}
                <span className="gradient-text">Shiva Study Center?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                We are committed to providing the best learning experience with a focus on individual growth and academic success.
              </p>
              
              <motion.ul initial="initial" whileInView="animate" viewport={{
              once: true
            }} variants={stagger} className="space-y-4">
                {benefits.map((benefit, index) => <motion.li key={benefit.text} variants={fadeInUp} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <benefit.icon className="w-5 h-5 text-success" />
                    </div>
                    <span className="text-foreground font-medium">{benefit.text}</span>
                  </motion.li>)}
              </motion.ul>
            </motion.div>

            <motion.div initial={{
            opacity: 0,
            x: 50
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.2
          }} className="relative">
              <div className="bg-card rounded-2xl p-8 md:p-10 shadow-xl border border-border">
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 blur-2xl opacity-50" />
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-lg">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                    Ready to Start Learning?
                  </h3>
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    Register now and join thousands of successful students who have achieved their goals with us.
                  </p>
                  <Link to="/student-login">
                    <Button className="w-full h-14 text-lg rounded-xl bg-primary hover:bg-primary/90 group">
                      Register as Student
                      <motion.span className="ml-2" animate={{
                      x: [0, 4, 0]
                    }} transition={{
                      duration: 1.5,
                      repeat: Infinity
                    }}>
                        <ArrowRight className="w-5 h-5" />
                      </motion.span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl flex items-center justify-center" animate={{
              y: [0, -10, 0],
              rotate: [0, 5, 0]
            }} transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}>
                <Award className="w-10 h-10 text-white" />
              </motion.div>
              <motion.div className="absolute -top-6 -left-6 w-16 h-16 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-xl flex items-center justify-center" animate={{
              y: [0, 10, 0],
              rotate: [0, -5, 0]
            }} transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}>
                <Sparkles className="w-7 h-7 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0">
          <motion.div className="absolute top-10 left-1/4 w-64 h-64 rounded-full bg-white/10 blur-3xl" animate={{
          scale: [1, 1.2, 1],
          x: [0, 20, 0]
        }} transition={{
          duration: 6,
          repeat: Infinity
        }} />
          <motion.div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-white/10 blur-3xl" animate={{
          scale: [1.2, 1, 1.2],
          y: [0, -30, 0]
        }} transition={{
          duration: 8,
          repeat: Infinity
        }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="text-center max-w-3xl mx-auto">
            <motion.div initial={{
            scale: 0
          }} whileInView={{
            scale: 1
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.5,
            delay: 0.2
          }} className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center mx-auto mb-8">
              <Zap className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
              Start Your Journey Today
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Don't wait to achieve your dreams. Join Shiva Study Center and take the first step towards success.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/student-login">
                <Button size="lg" className="btn-hero text-lg px-10 h-14 rounded-xl">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" className="btn-ghost-white text-lg px-10 h-14 rounded-xl">
                  Contact Us
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex justify-center">
              <a
                href="https://leadpe.online?utm_source=ssc&utm_medium=landing&utm_campaign=brand"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors text-sm font-medium"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                Built by Lead<span className="text-[#4ADE80]">Pe</span>.online — Build apps faster
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About the Platform & Creator Section */}
      <section className="py-20 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wider uppercase">
                Technology Partner
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                About the Platform & Creator
              </h2>
            </div>

            <div className="bg-card rounded-2xl p-8 md:p-10 border border-border">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                {/* Photo */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-muted">
                    <img src={swaritImage} alt="Swarit Roy - Founder, LeadPe" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <div className="mb-1">
                    <span className="text-sm font-medium text-primary">Founder – LeadPe</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-4">
                    Swarit Roy
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Swarit Roy is the creator of LeadPe, a platform designed to help businesses build modern websites 
                    that capture real customer leads. LeadPe focuses on turning websites into customer engines by enabling 
                    direct WhatsApp inquiries, calls, and lead forms that instantly connect businesses with potential customers.
                  </p>

                   {/* LeadPe Branding */}
                   <div className="bg-accent/50 rounded-xl p-5 mb-6">
                     <p className="text-sm text-foreground font-medium mb-2">Powered by <span className="text-[#111827]">Lead</span><span className="text-[#16A34A]">Pe</span></p>
                     <p className="text-sm text-muted-foreground leading-relaxed">
                       LeadPe helps businesses generate real customer inquiries through modern websites built for lead generation. 
                       Each website created with LeadPe is optimized for WhatsApp leads, phone calls, and smart contact forms.
                     </p>
                   </div>

                   {/* CTA */}
                   <a href="https://leadpe.online" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#16A34A] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#15803d] transition-colors">
                     Visit Lead<span className="text-white font-semibold">Pe</span>.online
                     <ExternalLink className="w-4 h-4" />
                   </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PWA Install handled by SmallPWAButton in header now */}
    </div>;
}