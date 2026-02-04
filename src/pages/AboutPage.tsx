import { BookOpen, Target, Award, Users, Sparkles, GraduationCap, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
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
    title: 'Mission',
    description: 'To provide quality education that empowers students to achieve their academic goals and develop lifelong learning skills.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Award,
    title: 'Vision',
    description: 'To be the leading coaching center recognized for excellence in education and student success.',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: Heart,
    title: 'Values',
    description: 'Integrity, dedication, and personalized attention to every student who walks through our doors.',
    gradient: 'from-amber-500 to-orange-600',
  },
];

const stats = [
  { value: '5000+', label: 'Students Taught' },
  { value: '95%', label: 'Success Rate' },
  { value: '50+', label: 'Expert Faculty' },
  { value: '14+', label: 'Years Experience' },
];

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative hero-gradient py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-5 py-2.5 mb-6 border border-white/20"
            >
              <GraduationCap className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">About Us</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 text-white">
              About Shiva Study Center
            </h1>
            <p className="text-lg md:text-xl text-white/80">
              Dedicated to nurturing minds and shaping futures through quality education since 2010.
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
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                variants={fadeInUp}
                className="text-center"
              >
                <motion.div 
                  className="text-4xl md:text-5xl font-display font-bold gradient-text mb-2"
                  initial={{ scale: 0.5, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: 'spring' }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 mesh-gradient">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <motion.div 
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent-gradient flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <BookOpen className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Our Story
              </h2>
            </div>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                Shiva Study Center was founded in 2010 with a simple yet powerful vision: to provide accessible, high-quality education to students aspiring to excel in their academic pursuits.
              </p>
              <p>
                What started as a small coaching center with just a handful of students has grown into a trusted institution that has helped over 5,000 students achieve their educational goals.
              </p>
              <p>
                Our success is built on the foundation of dedicated faculty, comprehensive study materials, and a student-centric approach that focuses on individual growth and development.
              </p>
              <p>
                Today, we continue our mission of educational excellence, embracing technology and innovative teaching methods while maintaining the personal touch that sets us apart.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wider uppercase">
              Our Core Values
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
              What <span className="gradient-text">Drives Us</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our core values guide everything we do at Shiva Study Center.
            </p>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            {values.map((value, index) => (
              <motion.div 
                key={value.title} 
                variants={fadeInUp}
                whileHover={{ y: -8 }}
                className="feature-card text-center"
              >
                <motion.div 
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mx-auto mb-6 shadow-xl`}
                  whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <value.icon className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-display font-bold text-foreground mb-4">
                  {value.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
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
