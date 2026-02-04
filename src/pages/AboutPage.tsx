import { BookOpen, Target, Award, Users, GraduationCap, Heart, Star, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const values = [
  {
    icon: Target,
    title: 'Our Mission',
    description: 'To provide quality education that builds strong conceptual foundations and prepares students for academic excellence.',
  },
  {
    icon: Award,
    title: 'Our Vision',
    description: 'To be a trusted coaching center recognized for producing disciplined, knowledgeable, and successful students.',
  },
  {
    icon: Heart,
    title: 'Our Values',
    description: 'Integrity, dedication, discipline, and personalized attention to every student who walks through our doors.',
  },
];

const highlights = [
  'Focus on conceptual clarity over rote learning',
  'Regular tests and performance tracking',
  'Both offline and online learning support',
  'Personalized attention to each student',
  'Comprehensive study materials and notes',
  'Disciplined and structured learning environment',
];

const stats = [
  { value: '500+', label: 'Students Taught' },
  { value: '90%', label: 'Success Rate' },
  { value: '10+', label: 'Years Experience' },
  { value: '6-12', label: 'Classes Covered' },
];

export default function AboutPage() {
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
              <GraduationCap className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">About Us</span>
            </motion.div>
            
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white">
              About Shiva Study Center
            </h1>
            <p className="text-lg md:text-xl text-white/80">
              Building strong foundations through conceptual learning and disciplined education.
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                variants={fadeInUp}
                className="text-center p-4"
              >
                <motion.div 
                  className="text-3xl md:text-4xl font-display font-bold text-primary mb-1"
                  initial={{ scale: 0.5, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: 'spring' }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-muted-foreground text-sm font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Teacher Section */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-card rounded-2xl p-8 md:p-10 shadow-sm border border-border">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <motion.div 
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  <GraduationCap className="w-12 h-12 md:w-16 md:h-16 text-primary" />
                </motion.div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-primary fill-primary" />
                    <span className="text-sm font-medium text-primary">Lead Educator</span>
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                    Sanjay Singhania Sir
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    M.Sc & B.Ed
                  </p>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    Sanjay Singhania Sir, an experienced and dedicated educator, leads Shiva Study Center 
                    with a strong focus on conceptual understanding, disciplined learning, and student success. 
                    With over a decade of teaching experience, he has helped hundreds of students build strong 
                    academic foundations and achieve their educational goals.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Our Story
              </h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Shiva Study Center was established with a clear purpose: to provide quality education 
                that focuses on building strong conceptual foundations rather than rote memorization.
              </p>
              <p>
                What started as a small coaching center has grown into a trusted institution where 
                students from classes 6 to 12 receive personalized attention and guidance. Our approach 
                combines traditional teaching methods with modern learning tools to ensure comprehensive 
                understanding of every subject.
              </p>
              <p>
                We believe in disciplined learning and consistent practice. Our regular tests, 
                detailed notes, and video lectures support students both in the classroom and at home, 
                ensuring they never fall behind in their studies.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-accent/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
              Why Choose Us
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              What makes Shiva Study Center different from other coaching institutes.
            </p>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto"
          >
            {highlights.map((highlight, index) => (
              <motion.div 
                key={index} 
                variants={fadeInUp}
                className="flex items-start gap-3 bg-card p-4 rounded-xl border border-border"
              >
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground text-sm">{highlight}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
              What Drives Us
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our core values guide everything we do at Shiva Study Center.
            </p>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {values.map((value) => (
              <motion.div 
                key={value.title} 
                variants={fadeInUp}
                className="bg-card p-6 rounded-xl border border-border text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
