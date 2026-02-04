import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, FileText, Play, ClipboardList, CheckCircle, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: 'Online Tests',
    description: 'Take MCQ-based tests with timer and instant results',
  },
  {
    icon: FileText,
    title: 'Study Notes',
    description: 'Access comprehensive notes organized by subject and class',
  },
  {
    icon: Play,
    title: 'Video Lectures',
    description: 'Watch expert video lessons anytime, anywhere',
  },
  {
    icon: Users,
    title: 'Personal Guidance',
    description: 'Get personalized attention and mentorship',
  },
];

const benefits = [
  'Expert faculty with years of experience',
  'Comprehensive study materials',
  'Regular assessments and feedback',
  'Doubt clearing sessions',
  'Progress tracking dashboard',
  'Flexible learning schedule',
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero-gradient py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center hero-text">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-medium">Excellence in Education Since 2010</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
              Shape Your Future with Quality Education
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join Shiva Study Center and unlock your potential with our comprehensive coaching program, expert faculty, and personalized learning approach.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="btn-hero text-lg px-8">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="btn-ghost-white text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools and resources you need for academic excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="feature-card group">
                <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                  <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Why Choose Shiva Study Center?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                We are committed to providing the best learning experience with a focus on individual growth and academic success.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-2xl font-display font-bold text-foreground mb-4">
                Ready to Start Learning?
              </h3>
              <p className="text-muted-foreground mb-6">
                Register now and join thousands of successful students who have achieved their goals with us.
              </p>
              <Link to="/auth">
                <Button className="w-full" size="lg">
                  Register Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Start Your Journey Today
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Don't wait to achieve your dreams. Join Shiva Study Center and take the first step towards success.
          </p>
          <Link to="/contact">
            <Button size="lg" className="btn-hero text-lg px-8">
              Contact Us
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
