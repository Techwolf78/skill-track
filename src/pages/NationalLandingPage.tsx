import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap,
  Shield,
  BarChart3,
  Users,
  Clock,
  Award,
  CheckCircle,
  Star,
  ArrowRight,
  Building,
  BookOpen,
  Target,
  Zap,
  Globe,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Shield,
    title: "Advanced Anti-Cheating",
    description:
      "AI-powered proctoring with real-time monitoring and automated violation detection.",
  },
  {
    icon: BarChart3,
    title: "Comprehensive Analytics",
    description:
      "Detailed performance insights with customizable reports and data-driven insights.",
  },
  {
    icon: Clock,
    title: "Real-time Assessment",
    description:
      "Instant evaluation with automated grading and immediate feedback systems.",
  },
  {
    icon: Target,
    title: "Custom Test Builder",
    description:
      "Create assessments with multiple question types, coding challenges, and adaptive difficulty.",
  },
  {
    icon: Users,
    title: "Multi-user Management",
    description:
      "Role-based access control for administrators, trainers, and students with bulk operations.",
  },
  {
    icon: Award,
    title: "Certification Ready",
    description:
      "Generate professional certificates and badges with blockchain verification.",
  },
];

const stats = [
  { number: "50,000+", label: "Students Assessed" },
  { number: "500+", label: "Partner Institutions" },
  { number: "98%", label: "Accuracy Rate" },
  { number: "24/7", label: "Support Available" },
];

const testimonials = [
  {
    name: "Dr. Rajesh Kumar",
    role: "Director, IIT Delhi",
    content:
      "RxOne has revolutionized our assessment process. The anti-cheating features and detailed analytics have helped us maintain academic integrity while providing valuable insights.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "HR Director, TCS",
    content:
      "The platform's scalability and customization options make it perfect for our large-scale recruitment drives. The automated evaluation saves us countless hours.",
    rating: 5,
  },
  {
    name: "Prof. Amit Patel",
    role: "Dean, Engineering College",
    content:
      "Outstanding platform for conducting online examinations. The real-time monitoring and comprehensive reporting features are exactly what we needed.",
    rating: 5,
  },
];

const useCases = [
  {
    icon: GraduationCap,
    title: "Educational Institutions",
    description:
      "Conduct secure online examinations, entrance tests, and skill assessments for universities and colleges nationwide.",
  },
  {
    icon: Building,
    title: "Corporate Training",
    description:
      "Evaluate employee skills, conduct certification programs, and measure training effectiveness across organizations.",
  },
  {
    icon: Users,
    title: "Placement Agencies",
    description:
      "Streamline candidate assessment with standardized tests and automated evaluation for better hiring decisions.",
  },
  {
    icon: BookOpen,
    title: "Government Programs",
    description:
      "Manage large-scale skill development initiatives with secure, scalable assessment solutions.",
  },
];

export default function NationalLandingPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    message: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Contact form submitted:", formData);
    alert(
      "Thank you for your interest! Our team will contact you within 24 hours.",
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
                <span className="text-lg font-bold text-primary-foreground">
                  R
                </span>
              </div>
              <span className="font-heading font-bold text-xl">RxOne</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button
                onClick={() =>
                  document
                    .getElementById("contact")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="mb-4">
                <Globe className="w-4 h-4 mr-2" />
                Trusted by 500+ Institutions Nationwide
              </Badge>
              <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
                India's Leading
                <span className="text-gradient-primary block">
                  Skill Assessment Platform
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Empower your institution with secure, scalable assessment
                solutions. Conduct examinations, evaluate skills, and drive
                excellence across India's educational and corporate landscape.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="text-lg px-8"
                  onClick={() =>
                    document
                      .getElementById("contact")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8"
                  onClick={() =>
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  View Demo
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Comprehensive Assessment Solutions
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to conduct secure, efficient, and insightful
              assessments at scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* No fuss section */}
    <section className="py-24 relative bg-white overflow-hidden">
  
  {/* Grid Background */}
  <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px]" />

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      
      {/* Left Image */}
      <div className="w-full">
        <img
          src="final-fuss-bg.png"
          alt="Assessment Platform"
          className="w-full h-auto rounded-2xl"
        />
      </div>

      {/* Right Content */}
      <div>
        <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 leading-tight">
          Find the best <br />
          candidate. No fuss.
        </h2>

        <p className="text-lg text-muted-foreground mb-6">
          Evalart’s online evaluations can pre-filter candidates to identify the best applicants and significantly reduce the number of candidates who require an interview.
        </p>

        <p className="text-lg text-muted-foreground mb-8">
          Online assessments allow you to filter out up to{" "}
          <span className="font-semibold text-foreground">
            80% of applicants.
          </span>
        </p>

        <div className="flex items-center gap-4">
          <button className="px-6 py-3 rounded-xl bg-primary text-white font-medium">
            Watch video
          </button>

          <button className="px-6 py-3 rounded-xl border border-border font-medium">
            See sample test
          </button>
        </div>
      </div>

    </div>
  </div>
</section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Perfect for Every Industry
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Trusted by educational institutions, corporations, and government
              bodies nationwide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <useCase.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                <p className="text-muted-foreground">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              What Our Partners Say
            </h2>
            <p className="text-xl text-muted-foreground">
              Join hundreds of institutions already using RxOne
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Ready to Transform Your Assessment Process?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join India's leading institutions in adopting next-generation
              assessment technology. Start your free trial today and experience
              the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8"
                onClick={() =>
                  document
                    .getElementById("contact")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Get Started Now
                <Zap className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-black"
              >
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-muted-foreground">
              Ready to get started? Contact our sales team for a personalized
              demonstration.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <span>sales@rxone.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <span>+91 1800-XXX-XXXX</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>Mumbai, Maharashtra</span>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">
                  Why Choose RxOne?
                </h3>
                <div className="space-y-3">
                  {[
                    "Pan-India presence with 500+ partners",
                    "24/7 technical support",
                    "Custom integration capabilities",
                    "GDPR compliant data security",
                    "Free training and onboarding",
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Request a Demo</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Input
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        name="organization"
                        placeholder="Organization/Institution"
                        value={formData.organization}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        name="phone"
                        type="tel"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Textarea
                        name="message"
                        placeholder="Tell us about your assessment needs..."
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={4}
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                      Send Message
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    R
                  </span>
                </div>
                <span className="font-heading font-bold">RxOne</span>
              </div>
              <p className="text-muted-foreground">
                India's premier skill assessment platform, trusted by
                institutions nationwide.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
                <li>Integrations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>About Us</li>
                <li>Careers</li>
                <li>Press</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Help Center</li>
                <li>Documentation</li>
                <li>Community</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>
              &copy; 2024 RxOne. All rights reserved. Made with ❤️ for India's
              education sector.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
