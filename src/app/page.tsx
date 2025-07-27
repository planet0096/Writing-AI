import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, BookCopy, Users, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary mb-4 tracking-tight">
            Unlock Your IELTS Potential
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The ultimate online platform for IELTS students and trainers. Access high-quality materials, connect with experts, and achieve your target score.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="#">Get Started for Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#features">Explore Features</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Value Proposition/Features Section */}
      <section id="features" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary">Why Choose IELTS Prep Hub?</h2>
            <p className="text-lg text-muted-foreground mt-2">Everything you need to succeed, all in one place.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<BookCopy className="w-10 h-10 text-accent" />}
              title="Practice Tests"
              description="Access a vast library of full-length mock tests and practice questions for all sections."
            />
            <FeatureCard
              icon={<Users className="w-10 h-10 text-accent" />}
              title="Expert Trainers"
              description="Connect with certified trainers for personalized feedback and one-on-one sessions."
            />
            <FeatureCard
              icon={<MessageSquare className="w-10 h-10 text-accent" />}
              title="Community Support"
              description="Join a vibrant community of fellow students to share tips, ask questions, and stay motivated."
            />
            <FeatureCard
              icon={<CheckCircle className="w-10 h-10 text-accent" />}
              title="Progress Tracking"
              description="Monitor your performance with detailed analytics and track your improvement over time."
            />
          </div>
        </div>
      </section>

      {/* Visual section */}
      <section className="py-20 md:py-24 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary mb-4">
              Designed for Success
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Our platform is built with a clean, intuitive interface that lets you focus on what matters most: learning and practicing. No distractions, just results.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-accent mt-1 shrink-0" />
                <span><strong className="font-semibold">Intuitive Dashboard:</strong> Easily navigate between study materials, tests, and feedback.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-accent mt-1 shrink-0" />
                <span><strong className="font-semibold">Responsive Design:</strong> Study anytime, anywhere, on any device.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-accent mt-1 shrink-0" />
                <span><strong className="font-semibold">SEO-Friendly Content:</strong> Our question bank is structured to be discoverable by search engines.</span>
              </li>
            </ul>
          </div>
          <div className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-border">
            <Image 
              src="https://placehold.co/600x400.png"
              alt="IELTS Prep Hub Dashboard"
              width={600}
              height={400}
              className="w-full h-auto object-cover"
              data-ai-hint="dashboard screen"
            />
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-headline text-primary mb-4">
            Ready to Ace Your IELTS Exam?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of students who have trusted IELTS Prep Hub to achieve their dreams.
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="#">Sign Up Now</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="text-center p-6 bg-card hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
      <CardHeader className="flex justify-center items-center p-0 mb-4">
        <div className="p-4 bg-accent/10 rounded-full">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <CardTitle className="text-xl font-bold font-headline text-primary mb-2">{title}</CardTitle>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
