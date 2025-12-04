import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  FileText,
  Mic,
  Brain,
  BarChart,
  Lock,
  Globe
} from 'lucide-react';

export default async function LandingPage() {
  const { userId, orgId } = auth();

  // If user is authenticated, redirect to dashboard
  if (userId && orgId) {
    redirect('/dashboard');
  }
  if (userId && !orgId) {
    redirect('/select-org');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">IP Paralegal</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Enterprise-grade IP Management
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
            Streamline Your IP
            <br />
            <span className="text-primary">Paralegal Workflow</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Record audio, transcribe with AI, extract entities, and auto-populate patent,
            trademark, and copyright forms. Built for enterprise teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary/90 transition shadow-lg shadow-primary/25"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-lg text-lg font-medium hover:bg-slate-50 transition border"
            >
              See Features
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete platform for IP paralegals and legal teams
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Mic className="w-6 h-6" />}
              title="Audio Recording"
              description="Record client calls and meetings directly in the browser. Upload existing audio files."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="AI Transcription"
              description="Powered by OpenAI Whisper for accurate speech-to-text conversion in multiple languages."
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Smart Forms"
              description="Auto-populate patent, trademark, and copyright forms from extracted entities."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Team Collaboration"
              description="Multi-tenant organizations with role-based access control and team workspaces."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Enterprise Security"
              description="SOC 2 compliant with audit logging, SSO, and encrypted data at rest."
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="API & Integrations"
              description="RESTful API with webhooks for custom integrations and workflow automation."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg">
              Start free, scale as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="$29"
              description="For small teams getting started"
              features={[
                '5 team members',
                '50 cases',
                '50 recordings/month',
                'AI transcription',
                'Email support',
              ]}
            />
            <PricingCard
              name="Professional"
              price="$79"
              description="For growing legal teams"
              features={[
                '20 team members',
                '500 cases',
                '500 recordings/month',
                'API access',
                'Audit logs',
                'Priority support',
              ]}
              highlighted
            />
            <PricingCard
              name="Enterprise"
              price="$299"
              description="For large organizations"
              features={[
                'Unlimited members',
                'Unlimited cases',
                'Unlimited recordings',
                'SSO / SAML',
                'Custom integrations',
                'Dedicated support',
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your IP Workflow?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Join thousands of legal professionals using IP Paralegal Platform
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-lg text-lg font-medium hover:bg-slate-100 transition"
          >
            Start Your Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">IP Paralegal Platform</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} IP Paralegal Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border hover:shadow-lg transition">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`p-8 rounded-xl border ${
        highlighted
          ? 'border-primary bg-primary/5 ring-2 ring-primary'
          : 'bg-white'
      }`}
    >
      <h3 className="font-semibold text-lg mb-1">{name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-muted-foreground">/month</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
              <ArrowRight className="w-3 h-3 text-primary" />
            </div>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={`block text-center py-3 rounded-lg font-medium transition ${
          highlighted
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-slate-100 hover:bg-slate-200'
        }`}
      >
        Get Started
      </Link>
    </div>
  );
}
