import { BookOpen, Target, Award, Users } from 'lucide-react';

const values = [
  {
    icon: Target,
    title: 'Mission',
    description: 'To provide quality education that empowers students to achieve their academic goals and develop lifelong learning skills.',
  },
  {
    icon: Award,
    title: 'Vision',
    description: 'To be the leading coaching center recognized for excellence in education and student success.',
  },
  {
    icon: Users,
    title: 'Values',
    description: 'Integrity, dedication, and personalized attention to every student who walks through our doors.',
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
    <div>
      {/* Hero Section */}
      <section className="hero-gradient py-20">
        <div className="container mx-auto px-4 text-center hero-text">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
            About Shiva Study Center
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Dedicated to nurturing minds and shaping futures through quality education since 2010.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">
                Our Story
              </h2>
            </div>
            <div className="prose prose-lg text-muted-foreground space-y-4">
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
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              What Drives Us
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our core values guide everything we do at Shiva Study Center.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div key={value.title} className="feature-card text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
