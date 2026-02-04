import { motion } from 'framer-motion';
import { FileText, ScrollText } from 'lucide-react';

const sections = [
  {
    title: 'Introduction',
    content: `Welcome to Shiva Study Center. By accessing and using our website and services, you agree to comply with these Terms and Conditions. These terms apply to all students, parents, and visitors who use our platform.`
  },
  {
    title: 'Student Responsibilities',
    content: `As a student of Shiva Study Center, you are expected to:
    
• Attend classes regularly and maintain discipline
• Complete assignments and tests on time
• Respect teachers, staff, and fellow students
• Use the online platform responsibly
• Keep your login credentials confidential
• Report any technical issues promptly`
  },
  {
    title: 'Account Registration & Access',
    content: `Account access is subject to approval by Shiva Study Center administration. Students must provide accurate information during registration. The institute reserves the right to approve, reject, or revoke access to any student account at its discretion. Once approved, students can access study materials, videos, and tests assigned to their class.`
  },
  {
    title: 'Usage of Educational Content',
    content: `All study materials including notes, videos, and tests provided through our platform are for personal educational use only. Students may:

• View and download notes for personal study
• Watch video lectures assigned to their class
• Attempt tests as per the schedule

Students must not share, distribute, or commercially use any content provided by Shiva Study Center.`
  },
  {
    title: 'Content Redistribution Policy',
    content: `Redistribution of any educational content from Shiva Study Center is strictly prohibited. This includes:

• Sharing notes or videos on social media or other platforms
• Forwarding study materials to non-registered students
• Recording or screen-capturing video lectures
• Copying test questions for distribution

Violation of this policy may result in immediate termination of account access.`
  },
  {
    title: 'Test & Assessment Rules',
    content: `Online tests conducted through our platform follow strict guidelines:

• Each test can be attempted only once
• Tests are timed and auto-submit upon completion
• Results are calculated automatically and stored permanently
• Students can only view their own results
• Any form of malpractice will result in disciplinary action`
  },
  {
    title: 'Institute Rights',
    content: `Shiva Study Center reserves the right to:

• Update, modify, or remove content at any time
• Change class schedules and test timings with prior notice
• Approve or reject student registrations
• Deactivate accounts for policy violations
• Modify these terms and conditions as needed`
  },
  {
    title: 'Limitation of Liability',
    content: `Shiva Study Center strives to provide accurate and helpful educational content. However, we are not liable for:

• Technical issues affecting platform access
• Variations in academic outcomes
• Third-party content linked from our platform
• Loss of data due to technical failures

Students and parents are advised to maintain their own backup of important materials.`
  },
  {
    title: 'Privacy & Data Protection',
    content: `We respect your privacy and protect your personal information. Student data including name, contact details, and academic performance is used solely for educational purposes. We do not share personal information with third parties without consent.`
  },
  {
    title: 'Contact Information',
    content: `For any queries regarding these terms or our services, please contact us:

• Email: info@shivastudycenter.com
• Phone: Available during institute hours
• Visit: Shiva Study Center premises

We encourage students and parents to reach out with any concerns or clarifications needed.`
  }
];

export default function TermsPage() {
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
              <ScrollText className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Legal</span>
            </motion.div>
            
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white">
              Terms & Conditions
            </h1>
            <p className="text-lg md:text-xl text-white/80">
              Please read these terms carefully before using our services.
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Last Updated */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
            >
              <FileText className="w-4 h-4" />
              <span>Last updated: February 2026</span>
            </motion.div>

            {/* Sections */}
            <div className="space-y-8">
              {sections.map((section, index) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card p-6 rounded-xl border border-border"
                >
                  <h2 className="text-lg font-display font-bold text-foreground mb-4">
                    {index + 1}. {section.title}
                  </h2>
                  <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Acceptance Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 p-6 bg-primary/5 rounded-xl border border-primary/20 text-center"
            >
              <p className="text-foreground text-sm">
                By using Shiva Study Center's services and platform, you acknowledge that you have read, 
                understood, and agree to be bound by these Terms and Conditions.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
